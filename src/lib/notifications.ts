import { supabase } from '@/integrations/supabase/client';

interface SendNotificationParams {
  userId: string;
  type: 'new_follower' | 'new_comment' | 'product_launch' | 'new_vote';
  title: string;
  message: string;
  relatedProductId?: string;
  relatedUserId?: string;
}

export const sendNotification = async (params: SendNotificationParams) => {
  try {
    // Check if user has email notifications enabled
    const { data: userPrefs } = await supabase
      .from('users')
      .select('email_notifications_enabled, notify_on_follow, notify_on_comment, notify_on_vote, notify_on_launch')
      .eq('id', params.userId)
      .single();

    if (!userPrefs?.email_notifications_enabled) {
      console.log('User has email notifications disabled');
      return;
    }

    // Check specific notification type preference
    const prefMap = {
      new_follower: 'notify_on_follow',
      new_comment: 'notify_on_comment',
      new_vote: 'notify_on_vote',
      product_launch: 'notify_on_launch',
    };

    const prefKey = prefMap[params.type];
    if (prefKey && !userPrefs[prefKey as keyof typeof userPrefs]) {
      console.log(`User has ${params.type} notifications disabled`);
      return;
    }

    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No session found');
      return;
    }

    // Call edge function to send notification
    const { error } = await supabase.functions.invoke('send-notifications', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: params,
    });

    if (error) {
      console.error('Error sending notification:', error);
    }
  } catch (error) {
    console.error('Notification error:', error);
  }
};

// Helper function to notify product owner about new follower
export const notifyProductFollow = async (productId: string, followerUsername: string) => {
  const { data: product } = await supabase
    .from('products')
    .select('owner_id, name')
    .eq('id', productId)
    .single();

  if (product) {
    await sendNotification({
      userId: product.owner_id,
      type: 'new_follower',
      title: 'New product follower',
      message: `@${followerUsername} is now following ${product.name}`,
      relatedProductId: productId,
    });
  }
};

// Helper function to notify product owner about new comment
export const notifyProductComment = async (productId: string, commenterUsername: string) => {
  const { data: product } = await supabase
    .from('products')
    .select('owner_id, name')
    .eq('id', productId)
    .single();

  if (product) {
    await sendNotification({
      userId: product.owner_id,
      type: 'new_comment',
      title: 'New comment on your product',
      message: `@${commenterUsername} commented on ${product.name}`,
      relatedProductId: productId,
    });
  }
};

// Helper function to notify product owner about new vote
export const notifyProductVote = async (productId: string, voterUsername: string) => {
  const { data: product } = await supabase
    .from('products')
    .select('owner_id, name')
    .eq('id', productId)
    .single();

  if (product) {
    await sendNotification({
      userId: product.owner_id,
      type: 'new_vote',
      title: 'New upvote on your product',
      message: `@${voterUsername} upvoted ${product.name}`,
      relatedProductId: productId,
    });
  }
};