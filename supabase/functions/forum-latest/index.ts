const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// In-memory cache with 5-minute TTL
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://forums.trylaunch.ai/latest.json', {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Discourse API returned ${response.status}`);
    }

    const data = await response.json();
    const topics = (data.topic_list?.topics || []).slice(0, 10);
    const categories = data.topic_list?.categories || data.categories || [];

    // Build category lookup
    const catMap = new Map<number, string>();
    // Categories might be in a separate top-level key
    const allCategories = categories.length > 0 ? categories : [];
    for (const cat of allCategories) {
      catMap.set(cat.id, cat.name);
    }

    const threads = topics.map((t: any) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      category: catMap.get(t.category_id) || null,
      replyCount: t.reply_count || t.posts_count - 1 || 0,
      createdAt: t.created_at,
      lastPostedAt: t.last_posted_at,
    }));

    const result = { success: true, threads };

    // Update cache
    cachedData = result;
    cacheTimestamp = now;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching forum data:', error);
    // Return cached data if available even if stale
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ success: false, threads: [], error: 'Failed to fetch forum data' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
