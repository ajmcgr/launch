import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Sparkles, Send, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface Lead {
  user_id: string;
  product_id: string | null;
  email: string;
  founder_name: string | null;
  username: string | null;
  plan: string;
  startup_name: string | null;
  slug: string | null;
  tagline: string | null;
  domain_url: string | null;
  launch_date: string | null;
  score: number;
  reason: string | null;
  funding_status: string | null;
  funding_confidence: number | null;
  funding_evidence: string | null;
  scored_at: string;
}

const DEFAULT_SUBJECT = 'Need help after launching?';
const DEFAULT_BODY = `Hey {{first_name}},

Launching is only step one.

Many startups get attention for a few days, then momentum fades.

We're opening a small number of support slots for Launch startups who want help with:

• Public relations
• Influencer marketing
• Community growth
• More users after launch

Reply interested if you'd like details.

– Alex
Launch`;

const Outreach = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sentToday, setSentToday] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scoring, setScoring] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  // Filters
  const [minScore, setMinScore] = useState(7);
  const [vcOnly, setVcOnly] = useState(false);
  const [paidOnly, setPaidOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);

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
    setSentToday(data?.sent_today || 0);
  };

  const handleScore = async () => {
    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('outreach-score-leads', { body: { limit: 25, onlyMissing: true } });
      if (error) throw error;
      toast.success(`Scored ${data.scored} new startups (${data.candidates_total} candidates total)`);
      await loadLeads();
    } catch (e: any) {
      toast.error(e.message || 'Scoring failed');
    } finally {
      setScoring(false);
    }
  };

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (l.score < minScore) return false;
      if (vcOnly && l.funding_status !== 'VC Backed') return false;
      if (paidOnly && (!l.plan || l.plan === 'free')) return false;
      if (recentOnly) {
        if (!l.launch_date) return false;
        const days = (Date.now() - new Date(l.launch_date).getTime()) / 86400000;
        if (days > 30) return false;
      }
      return true;
    });
  }, [leads, minScore, vcOnly, paidOnly, recentOnly]);

  const toggle = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectTop = (n: number) => {
    setSelected(new Set(filtered.slice(0, n).map(l => l.user_id)));
  };

  const stats = useMemo(() => ({
    qualified: leads.length,
    vc: leads.filter(l => l.funding_status === 'VC Backed').length,
    selected: selected.size,
  }), [leads, selected]);

  const handleSend = async () => {
    if (!selected.size) { toast.error('Select recipients first'); return; }
    if (!confirm(`Send to ${selected.size} recipient(s)?`)) return;
    setSending(true);
    try {
      const recipients = leads.filter(l => selected.has(l.user_id)).map(l => ({
        user_id: l.user_id,
        email: l.email,
        first_name: (l.founder_name || l.username || '').split(' ')[0] || '',
        startup_name: l.startup_name || '',
      }));
      const { data, error } = await supabase.functions.invoke('outreach-send-emails', { body: { recipients, subject, body } });
      if (error) throw error;
      toast.success(`Sent: ${data.sent} · Failed: ${data.failed} · Skipped (dedup/unsub): ${data.skipped}`);
      setSelected(new Set());
      await loadLeads();
    } catch (e: any) {
      toast.error(e.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Outreach</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleScore} disabled={scoring}>
            {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Score Startups
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Qualified Leads</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.qualified}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">VC Backed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.vc}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Selected</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.selected}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sent Today</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{sentToday}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-xs">Min score</Label>
            <Select value={String(minScore)} onValueChange={v => setMinScore(parseInt(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[0,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={vcOnly} onCheckedChange={v => setVcOnly(!!v)} /> VC Backed only</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={paidOnly} onCheckedChange={v => setPaidOnly(!!v)} /> Paid users only</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={recentOnly} onCheckedChange={v => setRecentOnly(!!v)} /> Launched in last 30d</label>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => selectTop(25)}>Select Top 25</Button>
            <Button size="sm" variant="outline" onClick={() => selectTop(50)}>Select Top 50</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Qualified startups ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {leads.length === 0 ? 'No scored leads yet. Click "Score Startups" to begin.' : 'No leads match these filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left">Score</th>
                    <th className="p-2 text-left">Funding</th>
                    <th className="p-2 text-left">Founder</th>
                    <th className="p-2 text-left">Startup</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Launched</th>
                    <th className="p-2 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.user_id} className="border-t hover:bg-muted/30">
                      <td className="p-2"><Checkbox checked={selected.has(l.user_id)} onCheckedChange={() => toggle(l.user_id)} /></td>
                      <td className="p-2 font-mono font-bold">{l.score}</td>
                      <td className="p-2">
                        {l.funding_status && (
                          <Badge variant={l.funding_status === 'VC Backed' ? 'default' : 'secondary'} className="text-[10px]">
                            {l.funding_status} {l.funding_confidence ? `${l.funding_confidence}%` : ''}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">{l.founder_name || l.username}</td>
                      <td className="p-2">
                        {l.slug ? (
                          <a href={`/launch/${l.slug}`} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                            {l.startup_name} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : l.startup_name}
                        {l.plan && l.plan !== 'free' && <Badge variant="outline" className="ml-2 text-[10px]">{l.plan}</Badge>}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{l.email}</td>
                      <td className="p-2 text-xs">{l.launch_date ? format(new Date(l.launch_date), 'MMM d') : '—'}</td>
                      <td className="p-2 text-xs text-muted-foreground max-w-md">{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email editor */}
      <Card>
        <CardHeader><CardTitle className="text-base">Email — sent from alex@trylaunch.ai</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Body — tokens: <code>{'{{first_name}}'}</code> <code>{'{{startup_name}}'}</code></Label>
            <Textarea rows={14} value={body} onChange={e => setBody(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending || !selected.size}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to {selected.size} recipient{selected.size === 1 ? '' : 's'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Batched 50/at-a-time. Auto-skips: emails sent in the last 30 days, suppressed addresses, and users with notifications disabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Outreach;
