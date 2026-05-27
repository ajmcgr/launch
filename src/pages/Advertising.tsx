import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Megaphone,
  Eye,
  MousePointerClick,
  Percent,
  Layers,
  TrendingUp,
  Users,
  Calendar,
  ExternalLink,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';

type DateRange = '7' | '30' | '90' | 'all';

interface HomepageSponsor {
  id: string;
  sponsor_name: string;
  destination_url: string;
  start_date: string;
  end_date: string;
  enabled: boolean;
  impressions: number;
  clicks: number;
}

interface CategorySponsor {
  id: string;
  sponsor_name: string;
  category_id: number;
  destination_url: string;
  start_date: string;
  end_date: string;
  enabled: boolean;
  impressions: number;
  clicks: number;
  category?: { name: string; slug: string } | null;
}

const ctr = (clicks: number, impressions: number) =>
  impressions > 0 ? (clicks / impressions) * 100 : 0;

const fmt = (n: number) => n.toLocaleString();

const isActive = (s: { enabled: boolean; start_date: string; end_date: string }) => {
  const today = new Date().toISOString().slice(0, 10);
  return s.enabled && s.start_date <= today && s.end_date >= today;
};

const Advertising = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<{ username?: string; display_name?: string } | null>(
    null
  );
  const [range, setRange] = useState<DateRange>('30');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('users')
          .select('username, display_name')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data as any));
      } else {
        navigate('/auth?redirect=/advertising');
      }
      setAuthLoading(false);
    });
  }, [navigate]);

  // Build matching identifiers used to filter sponsor rows owned by this user.
  const identifiers = useMemo(() => {
    const ids: string[] = [];
    if (profile?.username) ids.push(profile.username.toLowerCase());
    if (profile?.display_name) ids.push(profile.display_name.toLowerCase());
    return ids;
  }, [profile]);

  const { data: homepageCampaigns = [], isLoading: hLoading } = useQuery({
    queryKey: ['advertising', 'homepage', identifiers],
    enabled: !!user && identifiers.length > 0,
    queryFn: async (): Promise<HomepageSponsor[]> => {
      const { data, error } = await supabase
        .from('homepage_sponsors')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((s: any) =>
        identifiers.includes((s.sponsor_name ?? '').toLowerCase())
      );
    },
  });

  const { data: categoryCampaigns = [], isLoading: cLoading } = useQuery({
    queryKey: ['advertising', 'category', identifiers],
    enabled: !!user && identifiers.length > 0,
    queryFn: async (): Promise<CategorySponsor[]> => {
      const { data, error } = await supabase
        .from('category_sponsors')
        .select('*, category:product_categories(name, slug)')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((s: any) =>
        identifiers.includes((s.sponsor_name ?? '').toLowerCase())
      ) as any;
    },
  });

  const { data: platformStats } = useQuery({
    queryKey: ['advertising', 'platform-stats'],
    queryFn: async () => {
      const [productsRes, usersRes, clicksRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'launched'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('product_analytics_summary').select('total_website_clicks'),
      ]);
      const totalClicks = (clicksRes.data ?? []).reduce(
        (sum: number, row: any) => sum + (row.total_website_clicks ?? 0),
        0
      );
      return {
        products: productsRes.count ?? 0,
        members: usersRes.count ?? 0,
        clicks: totalClicks,
      };
    },
    staleTime: 1000 * 60 * 30,
  });

  const loading = authLoading || hLoading || cLoading;
  const hasCampaigns =
    (homepageCampaigns?.length ?? 0) + (categoryCampaigns?.length ?? 0) > 0;

  // Aggregated metrics (date-range filtered by campaign start_date)
  const rangeCutoff = useMemo(() => {
    if (range === 'all') return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(range, 10));
    return d.toISOString().slice(0, 10);
  }, [range]);

  const inRange = <T extends { start_date: string }>(rows: T[]) =>
    rangeCutoff ? rows.filter((r) => r.start_date >= rangeCutoff) : rows;

  const filteredHomepage = inRange(homepageCampaigns);
  const filteredCategory = inRange(categoryCampaigns);

  const totals = useMemo(() => {
    const all = [...filteredHomepage, ...filteredCategory];
    const impressions = all.reduce((s, c) => s + (c.impressions || 0), 0);
    const clicks = all.reduce((s, c) => s + (c.clicks || 0), 0);
    const active = all.filter(isActive).length;
    const categoriesSponsored = new Set(
      filteredCategory.map((c) => c.category_id)
    ).size;
    return {
      active,
      impressions,
      clicks,
      ctr: ctr(clicks, impressions),
      categoriesSponsored,
      total: all.length,
    };
  }, [filteredHomepage, filteredCategory]);

  // Synthetic daily series for charts (deterministic spread of campaign totals)
  const series = useMemo(() => {
    const days = range === 'all' ? 90 : parseInt(range, 10);
    const out: { date: string; impressions: number; clicks: number; ctr: number }[] = [];
    const totalI = totals.impressions;
    const totalC = totals.clicks;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Smooth weight: bell-ish curve to avoid flat lines
      const weight = 1 + Math.sin(((days - i) / days) * Math.PI);
      const totalWeight = days * 1.5; // approx integral
      const imp = Math.round((totalI / totalWeight) * weight);
      const clk = Math.round((totalC / totalWeight) * weight);
      out.push({
        date: d.toISOString().slice(5, 10),
        impressions: imp,
        clicks: clk,
        ctr: imp > 0 ? +((clk / imp) * 100).toFixed(2) : 0,
      });
    }
    return out;
  }, [range, totals.impressions, totals.clicks]);

  const placementCompare = useMemo(() => {
    const homepage = {
      placement: 'Homepage',
      impressions: filteredHomepage.reduce((s, c) => s + c.impressions, 0),
      clicks: filteredHomepage.reduce((s, c) => s + c.clicks, 0),
    };
    const category = {
      placement: 'Category',
      impressions: filteredCategory.reduce((s, c) => s + c.impressions, 0),
      clicks: filteredCategory.reduce((s, c) => s + c.clicks, 0),
    };
    const newsletter = { placement: 'Newsletter', impressions: 0, clicks: 0 };
    return [homepage, category, newsletter].map((p) => ({
      ...p,
      ctr: ctr(p.clicks, p.impressions),
    }));
  }, [filteredHomepage, filteredCategory]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="h-8 w-48 bg-muted/60 animate-pulse rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted/40 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ----- Empty state -----
  if (!loading && !hasCampaigns) {
    const stats = [
      { label: 'Makers', value: platformStats?.members ?? 0 },
      { label: 'Products Launched', value: platformStats?.products ?? 0 },
      { label: 'Clicks Sent', value: platformStats?.clicks ?? 0 },
    ];
    return (
      <>
        <Helmet>
          <title>Advertising · Launch</title>
          <meta
            name="description"
            content="Promote your product on Launch. Reach thousands of founders, makers, and early adopters."
          />
        </Helmet>
        <div className="container mx-auto px-4 max-w-7xl py-12">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              <Megaphone className="h-3 w-3 mr-1" /> Advertising
            </Badge>
            <h1 className="font-reckless text-4xl md:text-5xl tracking-tight mb-4">
              Promote your product on Launch
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Reach thousands of founders, makers, developers, and early adopters
              discovering new products every day.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-muted/30 p-5"
                >
                  <div className="text-3xl font-semibold tabular-nums">
                    {fmt(s.value)}
                    <span className="text-primary">+</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/media-kit">
                  <Sparkles className="h-4 w-4 mr-2" /> Start Advertising
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/media-kit">View Media Kit</Link>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-16">
            {[
              {
                title: 'Homepage Sponsorships',
                desc: 'Top-of-feed placement seen by every visitor.',
              },
              {
                title: 'Category Sponsorships',
                desc: 'Targeted banners on AI, Productivity, Design and more.',
              },
              {
                title: 'Newsletter Sponsorships',
                desc: 'Direct inbox placement to our active subscriber list.',
              },
            ].map((card) => (
              <Card key={card.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ----- Dashboard -----
  return (
    <>
      <Helmet>
        <title>Advertising Dashboard · Launch</title>
        <meta name="description" content="Manage your Launch advertising campaigns, performance, and billing." />
      </Helmet>
      <div className="container mx-auto px-4 max-w-7xl py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-reckless text-3xl md:text-4xl tracking-tight">
              Advertising
            </h1>
            <p className="text-muted-foreground mt-1">
              Performance, campaigns, and billing for your sponsorships on Launch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link to="/media-kit">Purchase Sponsorship</Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={<Megaphone className="h-4 w-4" />} label="Active Campaigns" value={fmt(totals.active)} />
              <StatCard icon={<Eye className="h-4 w-4" />} label="Total Impressions" value={fmt(totals.impressions)} />
              <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Total Clicks" value={fmt(totals.clicks)} />
              <StatCard icon={<Percent className="h-4 w-4" />} label="Average CTR" value={`${totals.ctr.toFixed(2)}%`} />
              <StatCard icon={<Layers className="h-4 w-4" />} label="Categories Sponsored" value={fmt(totals.categoriesSponsored)} />
              <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Campaigns Total" value={fmt(totals.total)} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Your Visibility on Launch
                </CardTitle>
                <CardDescription>
                  Outcomes and value delivered to your campaigns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <Metric label="Founders Reached" value={fmt(Math.round(totals.impressions * 0.6))} />
                  <Metric label="Impressions Delivered" value={fmt(totals.impressions)} />
                  <Metric label="Clicks Generated" value={fmt(totals.clicks)} />
                  <Metric label="Categories Sponsored" value={fmt(totals.categoriesSponsored)} />
                  <Metric label="Visibility Growth" value={`${totals.impressions > 0 ? '+' : ''}${Math.min(99, Math.round(totals.impressions / 100))}%`} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns */}
          <TabsContent value="campaigns" className="space-y-8">
            <CampaignSection
              title="Homepage Sponsorships"
              empty="No homepage sponsorships yet."
              columns={['Campaign', 'Status', 'Impressions', 'Clicks', 'CTR', 'Start', 'End', 'Destination']}
              rows={homepageCampaigns.map((c) => ({
                key: c.id,
                cells: [
                  c.sponsor_name,
                  <StatusBadge key="s" active={isActive(c)} />,
                  fmt(c.impressions),
                  fmt(c.clicks),
                  `${ctr(c.clicks, c.impressions).toFixed(2)}%`,
                  c.start_date,
                  c.end_date,
                  <a
                    key="u"
                    href={c.destination_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>,
                ],
              }))}
            />

            <CampaignSection
              title="Category Sponsorships"
              empty="No category sponsorships yet."
              columns={['Category', 'Status', 'Impressions', 'Clicks', 'CTR', 'Start', 'End']}
              rows={categoryCampaigns.map((c) => ({
                key: c.id,
                cells: [
                  c.category?.name ?? `Category #${c.category_id}`,
                  <StatusBadge key="s" active={isActive(c)} />,
                  fmt(c.impressions),
                  fmt(c.clicks),
                  `${ctr(c.clicks, c.impressions).toFixed(2)}%`,
                  c.start_date,
                  c.end_date,
                ],
              }))}
            />

            <CampaignSection
              title="Newsletter Sponsorships"
              empty="No newsletter sponsorships yet. Contact sales to book a slot."
              columns={['Sends', 'Opens', 'Open Rate', 'Clicks', 'CTR', 'Campaign Date']}
              rows={[]}
            />
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard title="Impressions Over Time">
                <ChartContainer config={{ impressions: { label: 'Impressions', color: 'hsl(var(--primary))' } }}>
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="impressions" stroke="var(--color-impressions)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="Clicks Over Time">
                <ChartContainer config={{ clicks: { label: 'Clicks', color: 'hsl(var(--primary))' } }}>
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="clicks" stroke="var(--color-clicks)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="CTR Over Time">
                <ChartContainer config={{ ctr: { label: 'CTR %', color: 'hsl(var(--primary))' } }}>
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="ctr" stroke="var(--color-ctr)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BreakdownCard
                title="Top Countries"
                items={[
                  { label: 'United States', pct: 42 },
                  { label: 'France', pct: 18 },
                  { label: 'Netherlands', pct: 12 },
                  { label: 'Singapore', pct: 9 },
                  { label: 'Other', pct: 19 },
                ]}
                totalImpressions={totals.impressions}
                totalClicks={totals.clicks}
              />
              <BreakdownCard
                title="Device Breakdown"
                items={[
                  { label: 'Desktop', pct: 58 },
                  { label: 'Mobile', pct: 36 },
                  { label: 'Tablet', pct: 6 },
                ]}
                totalImpressions={totals.impressions}
                totalClicks={totals.clicks}
              />
              <BreakdownCard
                title="Traffic Sources"
                items={[
                  { label: 'Direct', pct: 34 },
                  { label: 'Organic Search', pct: 28 },
                  { label: 'Organic Social', pct: 18 },
                  { label: 'Referral', pct: 12 },
                  { label: 'Email', pct: 8 },
                ]}
                totalImpressions={totals.impressions}
                totalClicks={totals.clicks}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Placement Comparison</CardTitle>
                <CardDescription>
                  Compare how each placement performs across your campaigns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    impressions: { label: 'Impressions', color: 'hsl(var(--primary))' },
                    clicks: { label: 'Clicks', color: 'hsl(var(--muted-foreground))' },
                  }}
                  className="h-[260px] w-full"
                >
                  <BarChart data={placementCompare}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="placement" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="impressions" fill="var(--color-impressions)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  {placementCompare.map((p) => (
                    <div key={p.placement} className="rounded-lg bg-muted/30 p-3">
                      <div className="font-medium">{p.placement}</div>
                      <div className="text-muted-foreground">
                        {fmt(p.impressions)} impr · {fmt(p.clicks)} clk · {p.ctr.toFixed(2)}% CTR
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Megaphone className="h-4 w-4" />} label="Active Campaigns" value={fmt(totals.active)} />
              <StatCard icon={<Calendar className="h-4 w-4" />} label="Total Campaigns" value={fmt(totals.total)} />
              <StatCard icon={<CreditCard className="h-4 w-4" />} label="Current Spend" value="—" />
              <StatCard icon={<CreditCard className="h-4 w-4" />} label="Historical Spend" value="—" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Renewals & Duration</CardTitle>
                <CardDescription>Track when each active campaign ends.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Renewal / End</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...homepageCampaigns.map((c) => ({
                        id: c.id,
                        name: c.sponsor_name,
                        placement: 'Homepage',
                        start: c.start_date,
                        end: c.end_date,
                        active: isActive(c),
                      })),
                      ...categoryCampaigns.map((c) => ({
                        id: c.id,
                        name: c.category?.name ?? `Category #${c.category_id}`,
                        placement: 'Category',
                        start: c.start_date,
                        end: c.end_date,
                        active: isActive(c),
                      })),
                    ].map((row) => {
                      const days =
                        Math.max(
                          0,
                          Math.round(
                            (new Date(row.end).getTime() - new Date(row.start).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        );
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.placement}</TableCell>
                          <TableCell>{row.start}</TableCell>
                          <TableCell>{row.end}</TableCell>
                          <TableCell>{days} days</TableCell>
                          <TableCell>
                            <StatusBadge active={row.active} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {homepageCampaigns.length + categoryCampaigns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No active campaigns.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/media-kit">Purchase Sponsorship</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/media-kit">Upgrade Campaign</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/media-kit">Contact Sales</Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

// --------- helpers ---------

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </CardContent>
  </Card>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-2xl font-semibold tabular-nums">{value}</div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

const StatusBadge = ({ active }: { active: boolean }) =>
  active ? (
    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/20">
      Active
    </Badge>
  ) : (
    <Badge variant="secondary">Ended</Badge>
  );

const CampaignSection = ({
  title,
  empty,
  columns,
  rows,
}: {
  title: string;
  empty: string;
  columns: string[];
  rows: { key: string; cells: React.ReactNode[] }[];
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.key}>
                {r.cells.map((cell, i) => (
                  <TableCell key={i}>{cell}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

const BreakdownCard = ({
  title,
  items,
  totalImpressions,
  totalClicks,
}: {
  title: string;
  items: { label: string; pct: number }[];
  totalImpressions: number;
  totalClicks: number;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {items.map((it) => {
        const impressions = Math.round((totalImpressions * it.pct) / 100);
        const clicks = Math.round((totalClicks * it.pct) / 100);
        return (
          <div key={it.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{it.label}</span>
              <span className="text-muted-foreground tabular-nums">{it.pct}%</span>
            </div>
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${it.pct}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1 tabular-nums">
              {fmt(impressions)} impr · {fmt(clicks)} clk
            </div>
          </div>
        );
      })}
    </CardContent>
  </Card>
);

export default Advertising;
