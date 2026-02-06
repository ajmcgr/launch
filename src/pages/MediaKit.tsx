import { Helmet } from 'react-helmet-async';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PopularProductIcons from '@/components/PopularProductIcons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import yogeshAvatar from '@/assets/yogesh-avatar.jpg';
import jakeAvatar from '@/assets/jake-avatar.jpg';

const MediaKit = () => {

  return (
    <>
      <Helmet>
        <title>Media Kit - Launch</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="max-w-2xl mx-auto px-4 py-12">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-reckless font-bold text-foreground">
              Media Kit
            </h1>
          </div>

          {/* Intro */}
          <div className="mb-6">
            <p className="text-lg text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">Launch is the #1 discovery platform</span> for indie makers to share, vote, and discover the next big thing. 
              Our highly engaged audience of entrepreneurs, developers, and early adopters are actively seeking new tools and products.
            </p>
          </div>

        </div>

        {/* Product Icons - Full Width */}
        <div className="mb-12">
          <PopularProductIcons />
        </div>

        <div className="max-w-4xl mx-auto px-4">

          {/* Metrics and Demographics Side by Side */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Left Column - Key Metrics */}
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-6 text-center border border-border shadow-sm">
                <p className="text-4xl font-bold text-primary">77K+</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Monthly Users</p>
              </div>
              <div className="bg-card rounded-xl p-6 text-center border border-border shadow-sm">
                <p className="text-4xl font-bold text-primary">70K+</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Monthly Impressions</p>
              </div>
              <div className="bg-card rounded-xl p-6 text-center border border-border shadow-sm">
                <p className="text-4xl font-bold text-primary">2.5K+</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Newsletter Subs</p>
              </div>
              <div className="bg-card rounded-xl p-6 text-center border border-border shadow-sm">
                <p className="text-4xl font-bold text-primary">25%</p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Email Open Rate</p>
              </div>
            </div>

            {/* Right Column - Audience & Traffic */}
            <div className="space-y-4">
              {/* Audience Demographics */}
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-foreground">
                  🌍 Audience by Country
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">🇺🇸 United States</span>
                    <span className="font-semibold text-foreground">28%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">🇬🇧 United Kingdom</span>
                    <span className="font-semibold text-foreground">13%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">🇮🇳 India</span>
                    <span className="font-semibold text-foreground">11%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">🇨🇳 China</span>
                    <span className="font-semibold text-foreground">9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">🌍 EU & Others</span>
                    <span className="font-semibold text-foreground">39%</span>
                  </div>
                </div>
              </div>

              {/* Traffic Sources */}
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-foreground">
                  📊 Traffic Sources
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-muted-foreground">Direct</span>
                      <span className="font-semibold text-foreground">55%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '55%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-muted-foreground">Organic Social</span>
                      <span className="font-semibold text-foreground">25%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-muted-foreground">Organic Search</span>
                      <span className="font-semibold text-foreground">15%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-muted-foreground">Referral</span>
                      <span className="font-semibold text-foreground">5%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '5%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-card rounded-xl p-8 mb-12">
            <h3 className="text-2xl font-bold text-foreground mb-2">Ready to reach our audience?</h3>
            <p className="text-muted-foreground mb-6">Get in touch to discuss opportunities</p>
            <a 
              href="mailto:alex@trylaunch.ai" 
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Email alex@trylaunch.ai
            </a>
            <p className="text-xs text-muted-foreground mt-6">
              Data source: Google Analytics. Updated February 2026
            </p>
          </div>

          {/* Testimonials - Stacked */}
          <div className="space-y-6 mb-12">
            {/* Jake's Testimonial */}
            <blockquote className="text-center">
              <p className="text-sm md:text-base leading-relaxed text-foreground/90 mb-4">
                "AdGenerator got great visibility from launching here. The engaged audience helped us get our first paying customers fast."
              </p>
              <footer className="flex items-center justify-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={jakeAvatar} alt="Jake" />
                  <AvatarFallback>JH</AvatarFallback>
                </Avatar>
                <div className="text-sm text-left">
                  <div className="font-medium">Jake</div>
                  <div className="text-muted-foreground">
                    AdGenerator · <a 
                      href="https://x.com/jakeh2792" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >@jakeh2792</a>
                  </div>
                </div>
              </footer>
            </blockquote>

            {/* Yogesh's Testimonial */}
            <blockquote className="text-center">
              <p className="text-sm md:text-base leading-relaxed text-foreground/90 mb-4">
                "Launched Supalytics on Launch and got instant traffic. The community here actually engages with products — not just scrolls past. Best decision for getting early users."
              </p>
              <footer className="flex items-center justify-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={yogeshAvatar} alt="Yogesh" />
                  <AvatarFallback>YA</AvatarFallback>
                </Avatar>
                <div className="text-sm text-left">
                  <div className="font-medium">Yogesh</div>
                  <div className="text-muted-foreground">
                    Supalytics · <a 
                      href="https://x.com/yogesharc" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >@yogesharc</a>
                  </div>
                </div>
              </footer>
            </blockquote>
          </div>

        </div>

        {/* Brand Assets Section */}
        <div>
          <div className="max-w-2xl mx-auto px-4 py-16">
            <div className="text-center mb-10">
              <h3 className="text-2xl font-bold text-foreground mb-2">Brand Assets</h3>
              <p className="text-muted-foreground">
                Download our logo files for press and media use
              </p>
            </div>
            
            {/* Logo Cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Gray Logo - Primary */}
              <div className="bg-card rounded-xl p-6">
                <div className="w-full h-20 rounded-lg flex items-center justify-center mb-3">
                  <img src="/media-kit/launch-logo-gray.png" alt="Launch Logo Gray" className="h-10 object-contain" />
                </div>
                <div className="mb-3">
                  <p className="font-medium text-foreground">Gray Logo</p>
                  <p className="text-sm text-muted-foreground">Primary</p>
                </div>
                <div className="flex gap-2">
                  <a href="/media-kit/launch-logo-gray.png" download className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">PNG</a>
                  <a href="/media-kit/launch-logo-gray.svg" download className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">SVG</a>
                </div>
              </div>

              {/* Black Logo */}
              <div className="bg-card rounded-xl p-6">
                <div className="w-full h-20 bg-white rounded-lg flex items-center justify-center mb-3">
                  <img src="/media-kit/launch-logo-black.png" alt="Launch Logo Black" className="h-10 object-contain" />
                </div>
                <div className="mb-3">
                  <p className="font-medium text-foreground">Black Logo</p>
                  <p className="text-sm text-muted-foreground">Light backgrounds</p>
                </div>
                <div className="flex gap-2">
                  <a href="/media-kit/launch-logo-black.png" download className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">PNG</a>
                  <a href="/media-kit/launch-logo-black.svg" download className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">SVG</a>
                </div>
              </div>

              {/* White Logo */}
              <div className="bg-card rounded-xl p-6">
                <div className="w-full h-20 bg-foreground rounded-lg flex items-center justify-center mb-3">
                  <img src="/media-kit/launch-logo-white.png" alt="Launch Logo White" className="h-10 object-contain" />
                </div>
                <div className="mb-3">
                  <p className="font-medium text-foreground">White Logo</p>
                  <p className="text-sm text-muted-foreground">Dark backgrounds</p>
                </div>
                <div className="flex gap-2">
                  <a href="/media-kit/launch-logo-white.png" download className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">PNG</a>
                  <a href="/media-kit/launch-logo-white.svg" download className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors">SVG</a>
                </div>
              </div>
            </div>

            {/* Download All Button */}
            <div className="flex justify-center mt-8">
              <Button asChild size="lg">
                <a href="/media-kit/launch-logos.zip" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download All Logos
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MediaKit;
