import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TYPEFULLY_API_URL = 'https://api.typefully.com/v2';

// Day-of-week to content section mapping (0=Sunday, 1=Monday, etc.)
const DAY_SECTIONS: Record<number, { key: string; title: string; emoji: string }> = {
  0: { key: 'top_karma', title: 'Launch Top Makers by Karma', emoji: '⚡' },
  1: { key: 'sponsored', title: 'Sponsored Launches', emoji: '💰' },
  2: { key: 'weekly_winners', title: 'Launch Weekly Winners', emoji: '📈' },
  3: { key: 'missed', title: '5 Launch Products You Missed This Week', emoji: '🕐' },
  4: { key: 'new_noteworthy', title: 'New & Noteworthy on Launch', emoji: '✨' },
  5: { key: 'hidden_gems', title: 'Launch Hidden Gems', emoji: '💎' },
  6: { key: 'makers', title: 'Launch Makers to Watch', emoji: '👀' },
};

// Truncate text to one sentence
const truncateToOneSentence = (text: string): string => {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
};

async function getSocialSetId(apiKey: string): Promise<string> {
  const res = await fetch(`${TYPEFULLY_API_URL}/social-sets`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch social sets: ${res.status}`);
  const data = await res.json();
  const sets = data.results || data;
  if (!sets || sets.length === 0) throw new Error('No social sets found in Typefully');
  return sets[0].id;
}

async function createTypefullyDraft(apiKey: string, socialSetId: string, text: string, scheduleDate?: string) {
  const body: any = {
    platforms: {
      x: {
        enabled: true,
        posts: [{ text }],
      },
    },
  };

  if (scheduleDate) {
    body.schedule = { date: scheduleDate };
  }

  const res = await fetch(`${TYPEFULLY_API_URL}/social-sets/${socialSetId}/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Typefully API error [${res.status}]: ${errorBody}`);
  }

  return await res.json();
}

async function fetchSponsoredLaunches(supabase: any) {
  const today = new Date().toISOString().split('T')[0];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [sponsoredRes, ordersRes] = await Promise.all([
    supabase
      .from('sponsored_products')
      .select('id, sponsorship_type, products(id, name, tagline, slug)')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('position', { ascending: true }),
    supabase
      .from('orders')
      .select('id, plan, product_id, products(id, name, tagline, slug)')
      .gte('created_at', oneWeekAgo)
      .not('product_id', 'is', null),
  ]);

  const sponsored = (sponsoredRes.data || []).map((sp: any) => ({
    name: sp.products?.name || 'Unknown',
    tagline: sp.products?.tagline,
    slug: sp.products?.slug || '',
  }));

  const existingSlugs = new Set(sponsored.map((p: any) => p.slug));
  const orderProducts = (ordersRes.data || [])
    .filter((o: any) => (o.plan || '').toLowerCase() !== 'free' && !existingSlugs.has(o.products?.slug))
    .map((o: any) => ({
      name: o.products?.name || 'Unknown',
      tagline: o.products?.tagline,
      slug: o.products?.slug || '',
    }));

  return [...sponsored, ...orderProducts];
}

async function fetchWeeklyWinners(supabase: any) {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [productsRes, votesRes] = await Promise.all([
    supabase.from('products').select('id, name, tagline, slug').eq('status', 'launched').gte('launch_date', twoWeeksAgo),
    supabase.from('product_vote_counts').select('product_id, net_votes'),
  ]);

  const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));

  return (productsRes.data || [])
    .map((p: any) => ({ ...p, net_votes: votesMap.get(p.id) || 0 }))
    .sort((a: any, b: any) => b.net_votes - a.net_votes)
    .slice(0, 5);
}

async function fetchMissedProducts(supabase: any) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [productsRes, votesRes] = await Promise.all([
    supabase.from('products').select('id, name, tagline, slug').eq('status', 'launched').gte('launch_date', twoWeeksAgo).lt('launch_date', oneWeekAgo),
    supabase.from('product_vote_counts').select('product_id, net_votes'),
  ]);

  const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));

  return (productsRes.data || [])
    .map((p: any) => ({ ...p, net_votes: votesMap.get(p.id) || 0 }))
    .sort((a: any, b: any) => b.net_votes - a.net_votes)
    .slice(0, 5);
}

async function fetchNewNoteworthy(supabase: any) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const [productsRes, votesRes] = await Promise.all([
    supabase.from('products').select('id, name, tagline, slug').eq('status', 'launched').gte('launch_date', threeDaysAgo).order('launch_date', { ascending: false }),
    supabase.from('product_vote_counts').select('product_id, net_votes'),
  ]);

  const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));

  return (productsRes.data || [])
    .map((p: any) => ({ ...p, net_votes: votesMap.get(p.id) || 0 }))
    .filter((p: any) => p.net_votes >= 1)
    .slice(0, 5);
}

async function fetchHiddenGems(supabase: any) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [productsRes, votesRes] = await Promise.all([
    supabase.from('products').select('id, name, tagline, slug').eq('status', 'launched').gte('launch_date', thirtyDaysAgo).order('launch_date', { ascending: false }).limit(50),
    supabase.from('product_vote_counts').select('product_id, net_votes'),
  ]);

  const votesMap = new Map((votesRes.data || []).map((v: any) => [v.product_id, v.net_votes || 0]));

  return (productsRes.data || [])
    .map((p: any) => ({ ...p, net_votes: votesMap.get(p.id) || 0 }))
    .filter((p: any) => p.net_votes >= 1 && p.net_votes <= 10)
    .slice(0, 5);
}

async function fetchMakersToWatch(supabase: any) {
  const { data: makers } = await supabase.from('product_makers').select('user_id, users(id, username, name)').limit(200);

  const builderCounts: Record<string, { user: any; count: number }> = {};
  (makers || []).forEach((m: any) => {
    if (m.users) {
      const userId = m.users.id;
      if (!builderCounts[userId]) builderCounts[userId] = { user: m.users, count: 0 };
      builderCounts[userId].count++;
    }
  });

  return Object.values(builderCounts)
    .filter((b) => b.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((b) => ({ username: b.user.username, name: b.user.name, product_count: b.count }));
}

function formatProductTweet(sectionTitle: string, emoji: string, products: any[]): string {
  if (!products || products.length === 0) return '';

  const lines = products.map((p: any, i: number) => {
    const tagline = p.tagline ? truncateToOneSentence(p.tagline) : '';
    const url = `https://trylaunch.ai/launch/${p.slug}`;
    return `${i + 1}. ${p.name}${tagline ? ' — ' + tagline : ''}\n${url}`;
  });

  return `${emoji} ${sectionTitle}\n\n${lines.join('\n\n')}\n\nDiscover more → https://trylaunch.ai`;
}

function formatMakersTweet(makers: any[]): string {
  if (!makers || makers.length === 0) return '';

  const lines = makers.map((m: any, i: number) => {
    const displayName = m.name || m.username;
    return `${i + 1}. ${displayName} (@${m.username}) — ${m.product_count} products\nhttps://trylaunch.ai/@${m.username}`;
  });

  return `👀 Launch Makers to Watch\n\n${lines.join('\n\n')}\n\nDiscover more → https://trylaunch.ai`;
}

async function fetchTopMakersByKarma(supabase: any) {
  const { data } = await supabase
    .from('user_karma')
    .select('user_id, username, name, karma')
    .order('karma', { ascending: false })
    .limit(10);

  return (data || []).filter((m: any) => m.karma > 0);
}

function formatTopKarmaTweet(makers: any[]): string {
  if (!makers || makers.length === 0) return '';

  const lines = makers.map((m: any, i: number) => {
    const displayName = m.name || m.username;
    return `${i + 1}. ${displayName} (@${m.username}) — ${m.karma} karma\nhttps://trylaunch.ai/@${m.username}`;
  });

  return `⚡ Launch Top Makers by Karma\n\n${lines.join('\n\n')}\n\nSee the full leaderboard → https://trylaunch.ai/makers`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const typefullyApiKey = Deno.env.get('TYPEFULLY_API_KEY');
    if (!typefullyApiKey) throw new Error('TYPEFULLY_API_KEY is not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Allow overriding the day via request body (for testing)
    let dayOfWeek: number;
    try {
      const body = await req.json();
      dayOfWeek = body.day !== undefined ? body.day : new Date().getDay();
    } catch {
      dayOfWeek = new Date().getDay();
    }

    console.log(`Post social content: day=${dayOfWeek}`);

    const section = DAY_SECTIONS[dayOfWeek];
    if (!section) {
      console.log('No content scheduled for today');
      return new Response(
        JSON.stringify({ message: 'No content scheduled for today', day: dayOfWeek }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching content for: ${section.title}`);

    // Get social set ID upfront
    const socialSetId = await getSocialSetId(typefullyApiKey);
    console.log(`Using social set: ${socialSetId}`);

    const draftsCreated: Array<{ section: string; draft_id: string; text_length: number }> = [];

    // 1. Always post Products to Promote (paid/sponsored launches) every day
    const sponsoredProducts = await fetchSponsoredLaunches(supabase);
    if (sponsoredProducts.length > 0) {
      const sponsoredTweet = formatProductTweet('Sponsored Launches', '💰', sponsoredProducts);
      if (sponsoredTweet) {
        console.log(`Sponsored tweet (${sponsoredTweet.length} chars):\n${sponsoredTweet}`);
        const sponsoredDraft = await createTypefullyDraft(typefullyApiKey, socialSetId, sponsoredTweet);
        console.log(`Sponsored draft created: ${JSON.stringify(sponsoredDraft)}`);
        draftsCreated.push({ section: 'Sponsored Launches', draft_id: sponsoredDraft.id, text_length: sponsoredTweet.length });
      }
    }

    // 2. Post the day's scheduled section (skip 'sponsored' since we already posted it above)
    let tweetText = '';
    if (section.key !== 'sponsored') {
      switch (section.key) {
        case 'weekly_winners': {
          const products = await fetchWeeklyWinners(supabase);
          tweetText = formatProductTweet(section.title, section.emoji, products);
          break;
        }
        case 'missed': {
          const products = await fetchMissedProducts(supabase);
          tweetText = formatProductTweet(section.title, section.emoji, products);
          break;
        }
        case 'new_noteworthy': {
          const products = await fetchNewNoteworthy(supabase);
          tweetText = formatProductTweet(section.title, section.emoji, products);
          break;
        }
        case 'hidden_gems': {
          const products = await fetchHiddenGems(supabase);
          tweetText = formatProductTweet(section.title, section.emoji, products);
          break;
        }
        case 'makers': {
          const makers = await fetchMakersToWatch(supabase);
          tweetText = formatMakersTweet(makers);
          break;
        }
        case 'top_karma': {
          const makers = await fetchTopMakersByKarma(supabase);
          tweetText = formatTopKarmaTweet(makers);
          break;
        }
      }

      if (tweetText) {
        console.log(`Section tweet (${tweetText.length} chars):\n${tweetText}`);
        const sectionDraft = await createTypefullyDraft(typefullyApiKey, socialSetId, tweetText);
        console.log(`Section draft created: ${JSON.stringify(sectionDraft)}`);
        draftsCreated.push({ section: section.title, draft_id: sectionDraft.id, text_length: tweetText.length });
      }
    }

    if (draftsCreated.length === 0) {
      console.log('No content available for any section');
      return new Response(
        JSON.stringify({ message: 'No content available', section: section.key }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        day: dayOfWeek,
        drafts: draftsCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error posting social content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
