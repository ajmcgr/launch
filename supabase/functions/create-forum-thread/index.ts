import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateHmac(data: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Sync a user to Discourse via the sync_sso admin endpoint.
 * This creates/updates the user account so we can post on their behalf.
 * Returns the Discourse username on success, or null on failure.
 */
async function syncUserToDiscourse(
  discourseUrl: string,
  discourseApiKey: string,
  ssoSecret: string,
  user: { id: string; email: string; username: string; name?: string; avatar_url?: string }
): Promise<string | null> {
  try {
    const ssoParams = new URLSearchParams({
      external_id: user.id,
      email: user.email,
      username: user.username,
      name: user.name || user.username,
      ...(user.avatar_url ? { avatar_url: user.avatar_url } : {}),
    });

    const ssoPayload = btoa(ssoParams.toString());
    const sig = generateHmac(ssoPayload, ssoSecret);

    const response = await fetch(`${discourseUrl}/admin/users/sync_sso`, {
      method: 'POST',
      headers: {
        'Api-Key': discourseApiKey,
        'Api-Username': 'system',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sso: ssoPayload, sig }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to sync user to Discourse [${response.status}]:`, errorText);
      return null;
    }

    const userData = await response.json();
    console.log(`Synced user to Discourse: ${userData.username}`);
    return userData.username;
  } catch (error) {
    console.error('Error syncing user to Discourse:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'productId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch product details including owner
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, tagline, description, domain_url, forum_thread_url, user_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Skip if already has a forum thread
    if (product.forum_thread_url) {
      console.log(`Product ${product.id} already has forum thread: ${product.forum_thread_url}`);
      return new Response(
        JSON.stringify({ forum_thread_url: product.forum_thread_url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Temporarily disable auto-posting to Discourse.
    // Keep returning 200 so launch flows don't fail while this is paused.
    console.warn('Auto forum posting is temporarily disabled');
    return new Response(
      JSON.stringify({ skipped: true, reason: 'auto_posting_disabled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

    // Determine which Discourse username to post as
    let postAsUsername = 'system';

    if (product.user_id && discourseSsoSecret) {
      // Fetch the product owner's profile and email
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('id, username, name, avatar_url')
        .eq('id', product.user_id)
        .single();

      // Get email from auth.users
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(product.user_id);

      if (owner?.username && authUser?.email) {
        const discourseUsername = await syncUserToDiscourse(
          discourseUrl,
          discourseApiKey,
          discourseSsoSecret,
          {
            id: owner.id,
            email: authUser.email,
            username: owner.username,
            name: owner.name || undefined,
            avatar_url: owner.avatar_url || undefined,
          }
        );

        if (discourseUsername) {
          postAsUsername = discourseUsername;
        }
      } else {
        console.warn('Could not fetch owner profile/email, falling back to system');
      }
    } else {
      console.warn('No user_id on product or SSO secret missing, posting as system');
    }

    console.log(`Posting forum thread as: ${postAsUsername}`);

    const productUrl = `https://trylaunch.ai/launch/${product.slug}`;
    const description = product.description
      ? product.description.substring(0, 500) + (product.description.length > 500 ? '...' : '')
      : product.tagline || '';

    const topicBody = `## ${product.name}\n\n${product.tagline || ''}\n\n${description}\n\n**🔗 [View on Launch](${productUrl})**${product.domain_url ? `\n**🌐 [Visit Website](${product.domain_url})**` : ''}\n\n---\n\nWhat do you think? Share your feedback, questions, or suggestions below! 💬`;

    // Find the "Show Launch" category
    const categoryResponse = await fetch(`${discourseUrl}/categories.json`, {
      headers: {
        'Api-Key': discourseApiKey,
        'Api-Username': 'system',
      },
    });

    let categoryId = null;
    if (categoryResponse.ok) {
      const categoriesData = await categoryResponse.json();
      const showLaunchCategory = categoriesData.category_list?.categories?.find(
        (c: any) => c.name === 'Show Launch' || c.slug === 'show-launch'
      );
      categoryId = showLaunchCategory?.id;
    }

    if (!categoryId) {
      console.warn('Show Launch category not found in Discourse, using default category');
      categoryId = 1;
    }

    // Create the topic as the product owner
    const createTopicResponse = await fetch(`${discourseUrl}/posts.json`, {
      method: 'POST',
      headers: {
        'Api-Key': discourseApiKey,
        'Api-Username': postAsUsername,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${product.name} - ${product.tagline || 'New Launch'}`,
        raw: topicBody,
        category: categoryId,
      }),
    });

    if (!createTopicResponse.ok) {
      const errorText = await createTopicResponse.text();
      console.error(`Discourse API error [${createTopicResponse.status}]:`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create forum thread' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const topicData = await createTopicResponse.json();
    const forumThreadUrl = `${discourseUrl}/t/${topicData.topic_slug}/${topicData.topic_id}`;

    console.log(`Created forum thread for ${product.name}: ${forumThreadUrl}`);

    // Save the forum thread URL to the product
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ forum_thread_url: forumThreadUrl })
      .eq('id', product.id);

    if (updateError) {
      console.error('Failed to save forum thread URL:', updateError);
    }

    return new Response(
      JSON.stringify({ forum_thread_url: forumThreadUrl, topic_id: topicData.topic_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error creating forum thread:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
