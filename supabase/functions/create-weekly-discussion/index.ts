const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyThread {
  title: string;
  body: string;
  category: string;
}

const WEEKLY_THREADS: Record<number, WeeklyThread> = {
  // Monday
  1: {
    title: '💡 What are you building this week?',
    body: `Happy Monday! Share what you're working on this week.\n\n- What's the project?\n- What's your goal for the week?\n- Need any feedback or help?\n\nLet's keep each other accountable and support one another! 💪`,
    category: 'General',
  },
  // Wednesday
  3: {
    title: '🔍 Feedback Wednesday — Drop your link, get honest feedback',
    body: `It's Feedback Wednesday! Post a link to your product, landing page, or idea and the community will give you honest, constructive feedback.\n\n**How it works:**\n1. Share your link + what kind of feedback you want\n2. Give feedback to at least 2 other posts\n3. Be specific and constructive\n\nLet's help each other ship better products! 🚀`,
    category: 'General',
  },
  // Friday
  5: {
    title: '🎉 Feedback Friday — What did you ship this week?',
    body: `It's Friday! Time to celebrate your wins, big or small.\n\n- What did you launch or ship?\n- What was your biggest learning?\n- What's on deck for next week?\n\nDrop a link and show off your progress! 🏆`,
    category: 'General',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const discourseUrl = Deno.env.get('DISCOURSE_FORUM_URL') || 'https://forums.trylaunch.ai';
    const discourseApiKey = Deno.env.get('DISCOURSE_API_KEY');

    if (!discourseApiKey) {
      throw new Error('DISCOURSE_API_KEY not configured');
    }

    // Allow day override via body, otherwise use current UTC day
    let dayOfWeek: number;
    try {
      const body = await req.json();
      dayOfWeek = body?.dayOfWeek ?? new Date().getUTCDay();
    } catch {
      dayOfWeek = new Date().getUTCDay();
    }

    const thread = WEEKLY_THREADS[dayOfWeek];
    if (!thread) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `No weekly thread scheduled for day ${dayOfWeek}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Add date to title to make it unique
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const fullTitle = `${thread.title} (${dateStr})`;

    // Find the target category
    const categoryResponse = await fetch(`${discourseUrl}/categories.json`, {
      headers: {
        'Api-Key': discourseApiKey,
        'Api-Username': 'system',
      },
    });

    let categoryId = 1; // default
    if (categoryResponse.ok) {
      const categoriesData = await categoryResponse.json();
      const targetCat = categoriesData.category_list?.categories?.find(
        (c: any) => c.name === thread.category || c.slug === thread.category.toLowerCase().replace(/\s+/g, '-'),
      );
      if (targetCat) categoryId = targetCat.id;
    }

    // Create the topic
    const createResponse = await fetch(`${discourseUrl}/posts.json`, {
      method: 'POST',
      headers: {
        'Api-Key': discourseApiKey,
        'Api-Username': 'system',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: fullTitle,
        raw: thread.body,
        category: categoryId,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`Discourse error [${createResponse.status}]:`, errorText);
      throw new Error(`Failed to create topic: ${createResponse.status}`);
    }

    const topicData = await createResponse.json();
    const topicUrl = `${discourseUrl}/t/${topicData.topic_slug}/${topicData.topic_id}`;

    console.log(`Created weekly thread: ${topicUrl}`);

    return new Response(
      JSON.stringify({ success: true, topic_url: topicUrl, topic_id: topicData.topic_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error creating weekly discussion:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
