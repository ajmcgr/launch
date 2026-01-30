import { Helmet } from 'react-helmet-async';
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
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Reach 73,000+ Developers & Founders
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Launch is the #1 discovery platform for indie makers to share, vote, and discover the next big thing. 
              Our highly engaged audience of entrepreneurs, developers, and early adopters are actively seeking new tools and products.
            </p>
          </div>

          {/* Testimonials */}
          <div className="mb-12 space-y-8">
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

        {/* Product Icons - Full Width */}
        <div className="my-12">
          <PopularProductIcons />
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-12">

          {/* Key Metrics */}
          <div className="space-y-4 mb-12">
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

          {/* Audience Demographics */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm mb-6">
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
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm mb-12">
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

          {/* Advertising Options */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-6 text-foreground text-center">
              Advertising Options
            </h3>
            <div className="space-y-6">
              <div className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-xl text-foreground">Homepage Banner</h4>
                  <span className="text-2xl font-bold text-primary">$250/mo</span>
                </div>
                <ul className="text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> Featured in product leaderboard
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 70K+ monthly impressions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> Premium above-fold placement
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> Detailed analytics reporting
                  </li>
                </ul>
              </div>
              <div className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-xl text-foreground">Newsletter Sponsorship</h4>
                  <span className="text-2xl font-bold text-primary">$200/mo</span>
                </div>
                <ul className="text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> Featured in weekly digest
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 2,500+ subscribers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> 25% average open rate
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">✓</span> Direct link to your product
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Combined Package */}
            <div className="mt-6 bg-primary text-primary-foreground rounded-xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h4 className="font-bold text-2xl">Combined Package</h4>
                  <p className="text-primary-foreground/80">Homepage Banner + Newsletter Sponsorship</p>
                </div>
                <div className="text-center sm:text-right">
                  <span className="text-3xl font-bold">$400/mo</span>
                  <p className="text-primary-foreground/80">Save $50/month</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-card rounded-xl p-8 border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-2">Ready to reach our audience?</h3>
            <p className="text-muted-foreground mb-6">Get in touch to discuss sponsorship opportunities</p>
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
