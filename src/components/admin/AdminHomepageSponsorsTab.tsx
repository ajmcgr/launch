import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface Sponsor {
  id: string;
  sponsor_name: string;
  banner_image_url: string;
  destination_url: string;
  position: number;
  start_date: string;
  end_date: string;
  enabled: boolean;
  impressions: number;
  clicks: number;
}

const today = () => new Date().toISOString().split('T')[0];
const plus30 = () => { const d = new Date(); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0]; };

export const AdminHomepageSponsorsTab = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    sponsor_name: '',
    banner_image_url: '',
    destination_url: '',
    position: 1,
    start_date: today(),
    end_date: plus30(),
    enabled: true,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('homepage_sponsors')
      .select('*')
      .order('position', { ascending: true });
    setSponsors((data as Sponsor[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `homepage-sponsors/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-media').upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) { toast.error('Upload failed: ' + error.message); return; }
    const { data } = supabase.storage.from('product-media').getPublicUrl(path);
    setForm(f => ({ ...f, banner_image_url: data.publicUrl }));
    toast.success('Banner uploaded');
  };

  const create = async () => {
    if (!form.sponsor_name || !form.banner_image_url || !form.destination_url) {
      toast.error('Sponsor name, banner, and destination URL are required');
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(form.destination_url.trim())
      ? form.destination_url.trim()
      : `https://${form.destination_url.trim().replace(/^\/+/, '')}`;
    setSaving(true);
    const { error } = await (supabase as any).from('homepage_sponsors').insert([{ ...form, destination_url: normalizedUrl }]);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Created homepage sponsorship');
    setForm({ sponsor_name: '', banner_image_url: '', destination_url: '', position: 1, start_date: today(), end_date: plus30(), enabled: true });
    load();
  };

  const toggleEnabled = async (s: Sponsor) => {
    await (supabase as any).from('homepage_sponsors').update({ enabled: !s.enabled }).eq('id', s.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this homepage sponsorship?')) return;
    await (supabase as any).from('homepage_sponsors').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Homepage Sponsorship</CardTitle>
          <CardDescription>Banners shown on the homepage between leaderboard sections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Sponsor name</Label>
              <Input value={form.sponsor_name} onChange={e => setForm(f => ({...f, sponsor_name: e.target.value}))} placeholder="Media" />
            </div>
            <div>
              <Label>Destination URL</Label>
              <Input value={form.destination_url} onChange={e => setForm(f => ({...f, destination_url: e.target.value}))} placeholder="https://..." />
            </div>
            <div>
              <Label>Position (sort order)</Label>
              <Input type="number" value={form.position} onChange={e => setForm(f => ({...f, position: parseInt(e.target.value) || 1}))} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({...f, enabled: v}))} />
              <Label>Enabled</Label>
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
            </div>
          </div>
          <div>
            <Label>Banner image</Label>
            <div className="flex items-center gap-3">
              <Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              {form.banner_image_url && <img src={form.banner_image_url} alt="" className="h-10 rounded border" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recommended: 992 × 124.</p>
          </div>
          <Button onClick={create} disabled={saving}>{saving ? 'Saving…' : 'Create homepage sponsorship'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Homepage Sponsorships</CardTitle>
          <CardDescription>Performance metrics per banner.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : sponsors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No homepage sponsorships yet. Run <code>database-category-sponsors.sql</code> to seed Media + Roach.</p>
          ) : (
            <div className="space-y-3">
              {sponsors.map(s => {
                const t = today();
                const active = s.enabled && s.start_date <= t && s.end_date >= t;
                const ctr = s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(2) : '0.00';
                return (
                  <div key={s.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start">
                    <img src={s.banner_image_url} alt={s.sponsor_name} className="h-12 rounded border flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{s.sponsor_name}</span>
                        <Badge variant="outline">Position #{s.position}</Badge>
                        {active ? <Badge className="bg-green-600">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        → <a href={s.destination_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.destination_url}</a>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(s.start_date), 'MMM d, yyyy')} – {format(new Date(s.end_date), 'MMM d, yyyy')}
                      </p>
                      <div className="flex gap-4 text-xs mt-2">
                        <span><strong>{s.impressions.toLocaleString()}</strong> impressions</span>
                        <span><strong>{s.clicks.toLocaleString()}</strong> clicks</span>
                        <span>CTR <strong>{ctr}%</strong></span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Switch checked={s.enabled} onCheckedChange={() => toggleEnabled(s)} />
                      <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHomepageSponsorsTab;
