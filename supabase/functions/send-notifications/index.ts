import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const productionUrl = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';
type NotificationType = 'new_follower' | 'new_comment' | 'product_launch' | 'new_vote';

interface NotificationRequest {
  userId: string;
  type: NotificationType;
  relatedProductId?: string;
  relatedUserId?: string;
}

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey);
    const token = authHeader.slice('Bearer '.length);
    const isServiceRequest = token === serviceRoleKey;
    let actorId: string | null = null;

    if (!isServiceRequest) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) return jsonResponse({ error: 'Unauthorized' }, 401);
      actorId = data.user.id;
    }

    const { userId, type, relatedProductId, relatedUserId }: NotificationRequest = await req.json();
    const allowedTypes: NotificationType[] = ['new_follower', 'new_comment', 'product_launch', 'new_vote'];
    if (!userId || !allowedTypes.includes(type)) return jsonResponse({ error: 'Invalid request body' }, 400);
    if (type === 'product_launch' && !isServiceRequest) return jsonResponse({ error: 'Forbidden' }, 403);
    if (type !== 'product_launch' && !actorId) return jsonResponse({ error: 'Forbidden' }, 403);

    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('email_notifications_enabled, notify_on_follow, notify_on_comment, notify_on_vote, notify_on_launch')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return jsonResponse({ error: 'Notification recipient not found' }, 404);

    const prefMap: Record<NotificationType, keyof typeof target> = {
      new_follower: 'notify_on_follow',
      new_comment: 'notify_on_comment',
      new_vote: 'notify_on_vote',
      product_launch: 'notify_on_launch',
    };
    if (!target.email_notifications_enabled || !target[prefMap[type]]) {
      return jsonResponse({ success: true, skipped: 'preferences' });
    }

    let title = '';
    let message = '';
    let verifiedRelatedUserId: string | null = actorId;
    let sourceCreatedAt: string | null = null;
    let sourceEventKey = '';
    const { data: actor } = actorId
      ? await supabaseAdmin.from('users').select('username').eq('id', actorId).maybeSingle()
      : { data: null };
    const actorName = actor?.username ? `@${actor.username}` : 'A Launch member';

    if (type === 'new_follower' && relatedProductId) {
      const [{ data: product }, { data: follow }] = await Promise.all([
        supabaseAdmin.from('products').select('owner_id, name').eq('id', relatedProductId).maybeSingle(),
        supabaseAdmin.from('product_follows').select('created_at').eq('product_id', relatedProductId).eq('follower_id', actorId!).maybeSingle(),
      ]);
      if (!product || product.owner_id !== userId || !follow) return jsonResponse({ error: 'Forbidden' }, 403);
      title = 'New product follower';
      message = `${actorName} is now following ${product.name}`;
      sourceCreatedAt = follow.created_at;
      sourceEventKey = `product-follow:${relatedProductId}:${actorId}`;
    } else if (type === 'new_follower') {
      const { data: follow } = await supabaseAdmin.from('follows').select('created_at')
        .eq('follower_id', actorId!).eq('followed_id', userId).maybeSingle();
      if (!follow || (relatedUserId && relatedUserId !== actorId)) return jsonResponse({ error: 'Forbidden' }, 403);
      title = 'New follower';
      message = `${actorName} is now following you`;
      sourceCreatedAt = follow.created_at;
      sourceEventKey = `user-follow:${userId}:${actorId}`;
    } else if (type === 'new_comment') {
      if (!relatedProductId) return jsonResponse({ error: 'Invalid request body' }, 400);
      const [{ data: product }, { data: comment }] = await Promise.all([
        supabaseAdmin.from('products').select('owner_id, name').eq('id', relatedProductId).maybeSingle(),
        supabaseAdmin.from('comments').select('id, created_at').eq('product_id', relatedProductId)
          .eq('user_id', actorId!).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!product || product.owner_id !== userId || !comment) return jsonResponse({ error: 'Forbidden' }, 403);
      title = 'New comment on your product';
      message = `${actorName} commented on ${product.name}`;
      sourceCreatedAt = comment.created_at;
      sourceEventKey = `comment:${comment.id}`;
    } else if (type === 'new_vote') {
      if (!relatedProductId) return jsonResponse({ error: 'Invalid request body' }, 400);
      const [{ data: product }, { data: vote }] = await Promise.all([
        supabaseAdmin.from('products').select('owner_id, name').eq('id', relatedProductId).maybeSingle(),
        supabaseAdmin.from('votes').select('id, created_at').eq('product_id', relatedProductId)
          .eq('user_id', actorId!).gt('value', 0).maybeSingle(),
      ]);
      if (!product || product.owner_id !== userId || !vote) return jsonResponse({ error: 'Forbidden' }, 403);
      title = 'New upvote on your product';
      message = `${actorName} upvoted ${product.name}`;
      sourceCreatedAt = vote.created_at;
      sourceEventKey = `vote:${vote.id}`;
    } else if (type === 'product_launch') {
      if (!relatedProductId) return jsonResponse({ error: 'Invalid request body' }, 400);
      const [{ data: product }, { data: follow }] = await Promise.all([
        supabaseAdmin.from('products').select('name, launch_date').eq('id', relatedProductId).maybeSingle(),
        supabaseAdmin.from('product_follows').select('created_at').eq('product_id', relatedProductId).eq('follower_id', userId).maybeSingle(),
      ]);
      if (!product || !follow) return jsonResponse({ error: 'Forbidden' }, 403);
      title = `${product.name} just launched!`;
      message = "The product you're following is now live.";
      sourceCreatedAt = product.launch_date;
      verifiedRelatedUserId = null;
      sourceEventKey = `product-launch:${relatedProductId}:${product.launch_date}`;
    }

    let duplicateQuery = supabaseAdmin.from('notifications').select('id').eq('user_id', userId).eq('type', type);
    duplicateQuery = relatedProductId
      ? duplicateQuery.eq('related_product_id', relatedProductId)
      : duplicateQuery.is('related_product_id', null);
    duplicateQuery = verifiedRelatedUserId
      ? duplicateQuery.eq('related_user_id', verifiedRelatedUserId)
      : duplicateQuery.is('related_user_id', null);
    if (sourceCreatedAt) duplicateQuery = duplicateQuery.gte('created_at', sourceCreatedAt);
    const { data: existing } = await duplicateQuery.limit(1).maybeSingle();
    if (existing) return jsonResponse({ success: true, skipped: 'duplicate' });

    const { data: notification, error: notifError } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      related_product_id: relatedProductId || null,
      related_user_id: verifiedRelatedUserId,
      source_event_key: sourceEventKey,
      email_sent: false,
    }).select().single();
    if (notifError?.code === '23505') return jsonResponse({ success: true, skipped: 'duplicate' });
    if (notifError) throw notifError;

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUser?.user?.email) {
      const safeTitle = escapeHtml(title);
      const safeMessage = escapeHtml(message);
      const productUrl = relatedProductId ? `${productionUrl}/launch/${encodeURIComponent(relatedProductId)}` : productionUrl;
      try {
        await resend.emails.send({
          from: 'Launch <notifications@trylaunch.ai>',
          to: [authUser.user.email],
          subject: title,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;color:#333;padding:40px 20px"><div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px"><img src="${productionUrl}/images/email-logo.png" alt="Launch" height="32"><h1 style="font-size:20px">${safeTitle}</h1><p>${safeMessage}</p>${relatedProductId ? `<p><a href="${productUrl}" style="display:inline-block;background:#206dcb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">View Product</a></p>` : ''}<p style="color:#9ca3af;font-size:12px"><a href="${productionUrl}/settings">Manage notifications</a></p></div></body></html>`,
        });
        await supabaseAdmin.from('notifications').update({ email_sent: true }).eq('id', notification.id);
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }
    }

    return jsonResponse({ success: true, notification });
  } catch (error) {
    console.error('Error in send-notifications:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
