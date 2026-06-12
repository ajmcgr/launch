import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import { freeTools, getFreeTool } from '@/lib/freeTools';
import { toast } from 'sonner';

const ToolDetail = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const tool = getFreeTool(slug);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const outputs = useMemo(() => {
    if (!tool) return [];
    if (tool.fields.length === 0) return tool.generate({});
    return submitted ? tool.generate(values) : [];
  }, [tool, submitted, values]);

  if (!tool) return <Navigate to="/tools" replace />;

  const url = `https://trylaunch.ai/tools/${tool.slug}`;
  const isStatic = tool.fields.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = tool.fields.find((f) => f.required && !(values[f.name] || '').trim());
    if (missing) {
      toast.error(`Please fill in: ${missing.label}`);
      return;
    }
    setSubmitted(true);
  };

  const copy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <>
      <Helmet>
        <title>{tool.name} — Free Tool by Launch</title>
        <meta name="description" content={tool.tagline} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`${tool.name} — Free Tool by Launch`} />
        <meta property="og:description" content={tool.tagline} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content="https://trylaunch.ai/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <section className="py-10">
          <div className="container mx-auto px-4 max-w-3xl">
            <Link
              to="/tools"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> All free tools
            </Link>

            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {tool.category}
            </div>
            <h1 className="text-3xl md:text-4xl font-reckless font-bold mb-3">{tool.name}</h1>
            <p className="text-lg text-muted-foreground mb-8">{tool.description}</p>

            {!isStatic && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {tool.fields.map((f) => (
                      <div key={f.name} className="space-y-1.5">
                        <Label htmlFor={f.name}>
                          {f.label}
                          {f.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        {f.type === 'textarea' ? (
                          <Textarea
                            id={f.name}
                            placeholder={f.placeholder}
                            value={values[f.name] || ''}
                            onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))}
                            rows={3}
                          />
                        ) : (
                          <Input
                            id={f.name}
                            placeholder={f.placeholder}
                            value={values[f.name] || ''}
                            onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                    <Button type="submit" size="lg" className="w-full">
                      Generate
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {outputs.length > 0 && (
              <div className="space-y-4">
                {outputs.map((out, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold">{out.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copy(out.body, idx)}
                          className="shrink-0"
                        >
                          {copiedIdx === idx ? (
                            <>
                              <Check className="h-4 w-4 mr-1.5" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1.5" /> Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm font-sans text-foreground/90 leading-relaxed">
                        {out.body}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card className="mt-10 bg-muted/40 border-dashed">
              <CardContent className="p-6 text-center space-y-3">
                <h3 className="text-xl font-semibold">Ready to actually launch?</h3>
                <p className="text-muted-foreground text-sm">
                  Submit your product to Launch and get in front of 500,000++ founders, makers, and indie hackers.
                </p>
                <Button asChild>
                  <Link to="/submit">Launch your product free</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="mt-12">
              <h3 className="text-lg font-semibold mb-3">Other free tools</h3>
              <div className="flex flex-wrap gap-2">
                {freeTools
                  .filter((t) => t.slug !== tool.slug)
                  .slice(0, 10)
                  .map((t) => (
                    <Link
                      key={t.slug}
                      to={`/tools/${t.slug}`}
                      className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70 text-sm transition-colors"
                    >
                      {t.name}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ToolDetail;
