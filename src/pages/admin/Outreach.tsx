import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface Lead {
  user_id: string;
  score: number;
  funding_status: string | null;
}

interface Emailed {
  user_id: string | null;
  sent_at: string;
  email: string | null;
  subject: string | null;
  founder_name: string | null;
  username: string | null;
  plan: string | null;
  startup_name: string | null;
  slug: string | null;
  launch_date: string | null;
  score: number | null;
  funding_status: string | null;
  funding_confidence: number | null;
  reason: string | null;
}

const Outreach = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [emailed, setEmailed] = useState<Emailed[]>([]);
  const [sentToday, setSentToday] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!roleData) { toast.error('Admin only'); navigate('/'); return; }
      setIsAdmin(true);
      await loadLeads();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLeads = async () => {
    const { data, error } = await supabase.functions.invoke('outreach-list-leads');
    if (error) { toast.error('Failed to load leads'); return; }
    setLeads(data?.leads || []);
    setEmailed(data?.emailed || []);
    setSentToday(data?.sent_today || 0);
  };

  const stats = useMemo(() => ({
    totalEmailed: emailed.length,
    qualified: leads.length,
    vc: leads.filter(l => l.funding_status === 'VC Backed').length,
  }), [leads, emailed]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return null;

  const adminTabs = [
    { value: 'metrics', label: 'Metrics', path: '/admin' },
    { value: 'manage', label: 'Ops', path: '/admin' },
    { value: 'marketing', label: 'Marketing', path: '/admin' },
    { value: 'outreach', label: 'Outreach', path: '/admin/outreach' },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1" />
        <h1 className="text-4xl font-reckless">Admin</h1>
        <div className="flex-1 flex justify-end">
          <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/30">
            {adminTabs.map(t => (
              <button
                key={t.value}
                onClick={() => navigate(t.path)}
                className={`text-sm px-3 h-8 rounded-md transition-colors ${
                  t.value === 'outreach'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sent Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{sentToday}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Emailed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalEmailed}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Qualified Leads</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.qualified}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">VC Backed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.vc}</div></CardContent></Card>
      </div>

      {/* Automation status */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3"><CardTitle className="text-base">Automation status</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ✅ Running daily at <strong>14:00 UTC</strong>. Scores newly-launched makers and emails the top 25 (score ≥ 7).
            Skips already-emailed, opted-out, and suppressed addresses.
          </p>
        </CardContent>
      </Card>

      {/* Emailed table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Emailed startups ({emailed.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {emailed.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No emails sent yet. The daily cron runs at 14:00 UTC.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Sent</th>
                    <th className="p-2 text-left">Score</th>
                    <th className="p-2 text-left">Funding</th>
                    <th className="p-2 text-left">Founder</th>
                    <th className="p-2 text-left">Startup</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {emailed.map((l, idx) => (
                    <tr key={`${l.user_id || l.email}-${l.sent_at}-${idx}`} className="border-t hover:bg-muted/30">
                      <td className="p-2 text-xs whitespace-nowrap">
                        <Badge variant="secondary" className="text-[10px]">{format(new Date(l.sent_at), 'MMM d HH:mm')}</Badge>
                      </td>
                      <td className="p-2 font-mono font-bold">{l.score ?? '—'}</td>
                      <td className="p-2">
                        {l.funding_status && (
                          <Badge variant={l.funding_status === 'VC Backed' ? 'default' : 'secondary'} className="text-[10px]">
                            {l.funding_status} {l.funding_confidence ? `${l.funding_confidence}%` : ''}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">{l.founder_name || l.username || '—'}</td>
                      <td className="p-2">
                        {l.slug ? (
                          <a href={`/launch/${l.slug}`} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                            {l.startup_name} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : l.startup_name || '—'}
                        {l.plan && l.plan !== 'free' && <Badge variant="outline" className="ml-2 text-[10px]">{l.plan}</Badge>}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{l.email}</td>
                      <td className="p-2 text-xs text-muted-foreground max-w-md truncate">{l.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Outreach;
