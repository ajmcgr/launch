const AUTO_COMMENT_USER_ID = '5a19e42c-f6df-4ae4-9ba0-caa7cf4359bc';
const AUTO_COMMENT_USERNAME = 'alex';

const ALEX_COMMENTS = [
  "Congrats on the launch! What inspired you to build this?",
  "Nice work — what's next on the roadmap?",
  "Looks great! Curious, who's the ideal user for this?",
  "Congrats! What was the hardest part of building it?",
  "Love the direction. How long did this take to put together?",
  "Awesome launch — what made you pick this problem to solve?",
  "Cool product! What's the one feature you're most proud of?",
  "Congrats on shipping! Any unexpected lessons along the way?",
  "Nice one — what's the story behind the name?",
  "Looks promising. What's the biggest challenge you're tackling next?",
  "Congrats! Curious how you're thinking about distribution?",
  "Great work. What would you do differently if you started over?",
  "Love this. Who's it for and what makes it different?",
  "Congrats on launching! What's been the best feedback so far?",
  "Nice launch — what tech stack did you build it on?",
  "Cool concept! How are you planning to grow from here?",
  "Congrats! What problem were you personally trying to solve?",
  "Looks solid. What's the v2 going to look like?",
];

async function getAlexUser(supabaseAdmin: any) {
  const { data: alexById, error: alexByIdError } = await supabaseAdmin
    .from('users')
    .select('id, username')
    .eq('id', AUTO_COMMENT_USER_ID)
    .maybeSingle();

  if (alexByIdError) {
    console.error('Auto-comment user lookup by ID failed:', alexByIdError);
  }

  if (alexById?.id) {
    return alexById;
  }

  const { data: alexByUsername, error: alexByUsernameError } = await supabaseAdmin
    .from('users')
    .select('id, username')
    .eq('username', AUTO_COMMENT_USERNAME)
    .maybeSingle();

  if (alexByUsernameError) {
    console.error('Auto-comment user lookup by username failed:', alexByUsernameError);
  }

  return alexByUsername ?? null;
}

export async function postAlexComment(supabaseAdmin: any, productId: string) {
  try {
    const alex = await getAlexUser(supabaseAdmin);

    if (!alex?.id) {
      console.log('Auto-comment skipped: @alex user not found');
      return false;
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('comments')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', alex.id)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('Auto-comment existence check failed:', existingError);
      return false;
    }

    if (existing) {
      console.log(`Auto-comment skipped: @alex already commented on ${productId}`);
      return false;
    }

    const content = ALEX_COMMENTS[Math.floor(Math.random() * ALEX_COMMENTS.length)];
    const { error: insertError } = await supabaseAdmin
      .from('comments')
      .insert({
        product_id: productId,
        user_id: alex.id,
        content,
        parent_comment_id: null,
        pinned: false,
      });

    if (insertError) {
      console.error('Auto-comment insert failed:', insertError);
      return false;
    }

    console.log(`Auto-comment posted on ${productId}: "${content}"`);
    return true;
  } catch (err) {
    console.error('Auto-comment error:', err);
    return false;
  }
}