import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Twitter, Linkedin } from 'lucide-react';
import html2canvas from 'html2canvas';
import PassSocialGraphic from '@/components/PassSocialGraphic';

const PassGraphic = () => {
  const [variant, setVariant] = useState<'twitter' | 'linkedin'>('twitter');
  const [isGenerating, setIsGenerating] = useState(false);
  const graphicRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    const element = document.getElementById('pass-social-graphic');
    if (!element) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      const link = document.createElement('a');
      link.download = `launch-pass-${variant}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Pass Social Graphic - Launch</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Pass Social Graphic</h1>
            <p className="text-muted-foreground">
              Download a shareable graphic for X or LinkedIn
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg">Preview</CardTitle>
                <div className="flex items-center gap-3">
                  <Tabs value={variant} onValueChange={(v) => setVariant(v as 'twitter' | 'linkedin')}>
                    <TabsList>
                      <TabsTrigger value="twitter" className="gap-2">
                        <Twitter className="h-4 w-4" />
                        X (16:9)
                      </TabsTrigger>
                      <TabsTrigger value="linkedin" className="gap-2">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={graphicRef} className="border rounded-lg overflow-hidden">
                <PassSocialGraphic variant={variant} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleDownload}
              disabled={isGenerating}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Download PNG'}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Icons only, no text. Perfect for social media posts about Launch Pass.
          </p>
        </div>
      </div>
    </>
  );
};

export default PassGraphic;
