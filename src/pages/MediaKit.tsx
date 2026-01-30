import { Helmet } from 'react-helmet-async';
import PopularProductIcons from '@/components/PopularProductIcons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Download } from 'lucide-react';
import yogeshAvatar from '@/assets/yogesh-avatar.jpg';
import jakeAvatar from '@/assets/jake-avatar.jpg';

const MediaKit = () => {
  const logos = [
    { name: 'Black Logo', png: '/media-kit/launch-logo-black.png', svg: '/media-kit/launch-logo-black.svg', bg: 'bg-white' },
    { name: 'Gray Logo', png: '/media-kit/launch-logo-gray.png', svg: '/media-kit/launch-logo-gray.svg', bg: 'bg-white' },
    { name: 'Gray with Background', png: '/media-kit/launch-logo-gray-bg.png', svg: '/media-kit/launch-logo-gray-bg.svg', bg: 'bg-white' },
    { name: 'White Logo', png: '/media-kit/launch-logo-white.png', svg: '/media-kit/launch-logo-white.svg', bg: 'bg-gray-800' },
  ];

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
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Reach 73,000+ Developers & Founders
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Launch is the #1 discovery platform for indie makers to share, vote, and discover the next big thing. 
              Our highly engaged audience of entrepreneurs, developers, and early adopters are actively seeking new tools and products.
            </p>
          </div>

        </div>

        {/* Product Icons - Full Width */}
        <div className="my-12">
          <PopularProductIcons />
        </div>

        <div className="max-w-4xl mx-auto px-4">

          {/* Two Column Layout - Metrics & Testimonials */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Left Column - Key Metrics */}
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-6 text-center border border-border shadow-sm">
                <p className="text-4xl font-bold text-primary">73K+</p>
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

            {/* Right Column - Testimonials */}
            <div className="space-y-6">
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

          {/* Two Column Layout - Demographics & Traffic */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Audience Demographics */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-foreground">
                🌍 Audience by Country
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">🇬🇧 United Kingdom</span>
                  <span className="font-semibold text-foreground">45%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">🇺🇸 United States</span>
                  <span className="font-semibold text-foreground">17%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">🇮🇳 India</span>
                  <span className="font-semibold text-foreground">8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">🇨🇳 China</span>
                  <span className="font-semibold text-foreground">6%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">🌍 EU & Others</span>
                  <span className="font-semibold text-foreground">24%</span>
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

        <div className="max-w-2xl mx-auto px-4 pb-12">

          {/* Logo Downloads */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-6 text-foreground text-center">
              Logo Downloads
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {logos.map((logo) => (
                <div key={logo.name} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className={`${logo.bg} p-6 flex items-center justify-center h-24`}>
                    <img src={logo.png} alt={logo.name} className="max-h-12 max-w-full object-contain" />
                  </div>
                  <div className="p-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-2">{logo.name}</p>
                    <div className="flex gap-2">
                      <a
                        href={logo.png}
                        download
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        PNG
                      </a>
                      <a
                        href={logo.svg}
                        download
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        SVG
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-card rounded-xl p-8 border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-2">Ready to reach our audience?</h3>
            <p className="text-muted-foreground mb-6">Get in touch to discuss opportunities</p>
            <a 
              href="mailto:alex@trylaunch.ai" 
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Email alex@trylaunch.ai
            </a>
            <p className="text-xs text-muted-foreground mt-6">
              Data source: Google Analytics. Updated January 2026
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MediaKit;
