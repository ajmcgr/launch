const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UMAMI_API_KEY = "api_qJbOUc8Ksl62zKaY7LDiOcyZKZZdy1ZE";
const WEBSITE_ID = "1f21892f-ed7c-4d90-acf5-4225124a0b40";
const BASE = "https://api.umami.is/v1";

async function umami(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-umami-api-key": UMAMI_API_KEY, "Accept": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Umami ${path} ${res.status}: ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "24h";
    const now = Date.now();
    const ranges: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    const span = ranges[range] ?? ranges["24h"];
    const startAt = now - span;
    const endAt = now;
    const qs = `startAt=${startAt}&endAt=${endAt}`;

    const [stats, pageviews, urls, referrers, browsers, os, devices, countries] = await Promise.all([
      umami(`/websites/${WEBSITE_ID}/stats?${qs}`),
      umami(`/websites/${WEBSITE_ID}/pageviews?${qs}&unit=${range === "1h" || range === "24h" ? "hour" : "day"}&timezone=UTC`),
      umami(`/websites/${WEBSITE_ID}/metrics?${qs}&type=url&limit=20`),
      umami(`/websites/${WEBSITE_ID}/metrics?${qs}&type=referrer&limit=20`),
      umami(`/websites/${WEBSITE_ID}/metrics?${qs}&type=browser&limit=10`),
      umami(`/websites/${WEBSITE_ID}/metrics?${qs}&type=os&limit=10`),
      umami(`/websites/${WEBSITE_ID}/metrics?${qs}&type=device&limit=10`),
      umami(`/websites/${WEBSITE_ID}/metrics?${qs}&type=country&limit=20`),
    ]);

    return new Response(
      JSON.stringify({ range, stats, pageviews, urls, referrers, browsers, os, devices, countries }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
