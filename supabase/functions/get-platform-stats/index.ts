import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- GA4 helpers ---
function base64UrlEncode(input: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

async function getGA4AccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encClaim = base64UrlEncode(JSON.stringify(claim));
  const signingInput = `${encHeader}.${encClaim}`;

  const keyBuffer = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const encSig = base64UrlEncode(signature);
  const jwt = `${signingInput}.${encSig}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`GA4 token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function fetchGA4Data(): Promise<{
  visitorsYTD: number;
  pageviewsYTD: number;
  sessionsYTD: number;
  liveVisitors: number;
} | null> {
  const propertyId = Deno.env.get("GA4_PROPERTY_ID");
  const saJsonRaw = Deno.env.get("GA4_SERVICE_ACCOUNT_JSON");
  if (!propertyId || !saJsonRaw) {
    console.warn("GA4 secrets not configured");
    return null;
  }
  try {
    const sa = JSON.parse(saJsonRaw);
    const token = await getGA4AccessToken(sa);

    // 30-day report
    const reportResp = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: new Date(new Date().getUTCFullYear(), 0, 1).toISOString().split("T")[0], endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "screenPageViews" },
            { name: "sessions" },
          ],
        }),
      },
    );
    const reportData = await reportResp.json();
    if (!reportResp.ok) {
      console.error("GA4 runReport failed:", reportData);
      return null;
    }
    const row = reportData.rows?.[0]?.metricValues ?? [];

    // Realtime report — active users right now
    const realtimeResp = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metrics: [{ name: "activeUsers" }],
        }),
      },
    );
    const realtimeData = await realtimeResp.json();
    let liveVisitors = 0;
    if (realtimeResp.ok) {
      liveVisitors = parseInt(
        realtimeData.rows?.[0]?.metricValues?.[0]?.value ?? "0",
        10,
      );
    } else {
      console.error("GA4 realtime report failed:", realtimeData);
    }

    return {
      visitorsYTD: parseInt(row[0]?.value ?? "0", 10),
      pageviewsYTD: parseInt(row[1]?.value ?? "0", 10),
      sessionsYTD: parseInt(row[2]?.value ?? "0", 10),
      liveVisitors,
    };
  } catch (err) {
    console.error("GA4 fetch error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [productsRes, usersRes, clicksRes, ga4] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "launched"),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("product_analytics_summary").select("total_website_clicks"),
      fetchGA4Data(),
    ]);

    const clicksSent = (clicksRes.data ?? []).reduce(
      (sum: number, row: any) => sum + (row.total_website_clicks ?? 0),
      0,
    );

    return new Response(
      JSON.stringify({
        launched: productsRes.count ?? 0,
        makers: usersRes.count ?? 0,
        clicksSent,
        visitorsYTD: ga4?.visitorsYTD ?? null,
        pageviewsYTD: ga4?.pageviewsYTD ?? null,
        sessionsYTD: ga4?.sessionsYTD ?? null,
        liveVisitors: ga4?.liveVisitors ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-platform-stats error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
