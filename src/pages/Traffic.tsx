import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Stat = { value: number; prev?: number };
type StatsResponse = {
  pageviews: Stat;
  visitors: Stat;
  visits: Stat;
  bounces: Stat;
  totaltime: Stat;
};
type MetricRow = { x: string; y: number };
type PageviewRow = { x: string; y: number };

type Data = {
  range: string;
  stats: StatsResponse;
  pageviews: { pageviews: PageviewRow[]; sessions: PageviewRow[] };
  urls: MetricRow[];
  referrers: MetricRow[];
  browsers: MetricRow[];
  os: MetricRow[];
  devices: MetricRow[];
  countries: MetricRow[];
};

const RANGES = [
  { id: "1h", label: "Last hour" },
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

function fmt(n: number | undefined) {
  if (n == null) return "0";
  return n.toLocaleString();
}

function MetricList({ title, rows, formatter }: { title: string; rows: MetricRow[]; formatter?: (s: string) => string }) {
  const max = Math.max(...rows.map((r) => r.y), 1);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-reckless">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground">No data</div>}
        {rows.map((r) => (
          <div key={r.x} className="relative">
            <div className="absolute inset-0 bg-muted/40 rounded" style={{ width: `${(r.y / max) * 100}%` }} />
            <div className="relative flex items-center justify-between px-2 py-1 text-sm">
              <span className="truncate pr-2">{formatter ? formatter(r.x) : r.x || "(direct)"}</span>
              <span className="tabular-nums text-muted-foreground">{fmt(r.y)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Traffic() {
  const [range, setRange] = useState("24h");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data: res, error: err } = await supabase.functions.invoke("umami-analytics", {
          method: "GET",
          headers: {},
          body: undefined,
          // pass range via query string
        });
        // supabase-js doesn't support query params on invoke; fetch directly
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/umami-analytics?range=${range}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Failed to load");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  const s = data?.stats;
  const avgTime = s ? Math.round((s.totaltime?.value || 0) / Math.max(s.visits?.value || 1, 1)) : 0;
  const bounceRate = s && s.visits?.value ? Math.round(((s.bounces?.value || 0) / s.visits.value) * 100) : 0;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <Helmet><title>Traffic Analytics — Launch</title><meta name="robots" content="noindex" /></Helmet>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-reckless">Traffic</h1>
        <div className="flex gap-1 flex-wrap">
          {RANGES.map((r) => (
            <Button key={r.id} size="sm" variant={range === r.id ? "default" : "outline"} onClick={() => setRange(r.id)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-destructive mb-4">{error}</div>}
      {loading && !data && <div className="text-sm text-muted-foreground">Loading…</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Visitors</div><div className="text-2xl font-reckless">{fmt(s?.visitors?.value)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pageviews</div><div className="text-2xl font-reckless">{fmt(s?.pageviews?.value)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Visits</div><div className="text-2xl font-reckless">{fmt(s?.visits?.value)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Bounce rate</div><div className="text-2xl font-reckless">{bounceRate}%</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Avg. visit</div><div className="text-2xl font-reckless">{avgTime}s</div></CardContent></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <MetricList title="Top pages" rows={data.urls} />
            <MetricList title="Top referrers" rows={data.referrers} />
            <MetricList title="Countries" rows={data.countries} />
            <MetricList title="Browsers" rows={data.browsers} />
            <MetricList title="Operating systems" rows={data.os} />
            <MetricList title="Devices" rows={data.devices} />
          </div>
        </>
      )}
    </div>
  );
}
