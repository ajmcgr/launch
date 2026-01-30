import { Helmet } from 'react-helmet-async';
import logoLight from '@/assets/logo.png';

const MediaKit = () => {
  return (
    <>
      <Helmet>
        <title>Media Kit - Launch</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      {/* Print-optimized single page */}
      <div className="min-h-screen bg-white text-gray-900 print:min-h-0">
        <div className="max-w-4xl mx-auto px-8 py-10 print:py-6 print:px-4">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-8">
            <div className="flex items-center gap-3">
              <img src={logoLight} alt="Launch" className="h-10 w-auto" />
              <span className="text-2xl font-bold tracking-tight">Launch</span>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-gray-900">Media Kit</h1>
              <p className="text-sm text-gray-600">January 2025</p>
            </div>
          </div>

          {/* Intro */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3 text-gray-900">
              Reach 73,000+ Indie Makers & Founders
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Launch is the #1 discovery platform for indie makers to share, vote, and discover the next big thing. 
              Our highly engaged audience of entrepreneurs, developers, and early adopters are actively seeking new tools and products.
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
              <p className="text-3xl font-bold text-gray-900">73K+</p>
              <p className="text-sm text-gray-600 font-medium">Monthly Users</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
              <p className="text-3xl font-bold text-gray-900">70K+</p>
              <p className="text-sm text-gray-600 font-medium">Monthly Impressions</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
              <p className="text-3xl font-bold text-gray-900">2.5K+</p>
              <p className="text-sm text-gray-600 font-medium">Newsletter Subs</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
              <p className="text-3xl font-bold text-gray-900">25%</p>
              <p className="text-sm text-gray-600 font-medium">Email Open Rate</p>
            </div>
          </div>

          {/* Two Column: Audience + Screenshot */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Audience Demographics */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 border-b border-gray-300 pb-2">
                Audience Demographics
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">🇬🇧 United Kingdom</span>
                  <span className="font-semibold text-gray-900">45%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">🇺🇸 United States</span>
                  <span className="font-semibold text-gray-900">17%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">🇮🇳 India</span>
                  <span className="font-semibold text-gray-900">8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">🇨🇳 China</span>
                  <span className="font-semibold text-gray-900">6%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">🌍 EU & Others</span>
                  <span className="font-semibold text-gray-900">24%</span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold mt-6 mb-3 text-gray-900 border-b border-gray-300 pb-2">
                Traffic Sources
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Direct</span>
                  <span className="font-semibold text-gray-900">55%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Organic Social</span>
                  <span className="font-semibold text-gray-900">25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Organic Search</span>
                  <span className="font-semibold text-gray-900">15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Referral</span>
                  <span className="font-semibold text-gray-900">5%</span>
                </div>
              </div>
            </div>

            {/* Screenshot placeholder */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-900 border-b border-gray-300 pb-2">
                Homepage Placement
              </h3>
              <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-300 aspect-[4/3] flex items-center justify-center">
                <img 
                  src="https://trylaunch.ai/og-image.png" 
                  alt="Launch Homepage"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Premium banner placement in the product leaderboard
              </p>
            </div>
          </div>

          {/* Advertising Options */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4 text-gray-900 border-b border-gray-300 pb-2">
              Advertising Options
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">Homepage Banner</h4>
                  <span className="text-xl font-bold text-gray-900">$250/mo</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Featured in product leaderboard</li>
                  <li>• 70K+ monthly impressions</li>
                  <li>• Premium above-fold placement</li>
                  <li>• Detailed analytics reporting</li>
                </ul>
              </div>
              <div className="border-2 border-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">Newsletter Sponsorship</h4>
                  <span className="text-xl font-bold text-gray-900">$200/mo</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Featured in weekly digest</li>
                  <li>• 2,500+ subscribers</li>
                  <li>• 25% average open rate</li>
                  <li>• Direct link to your product</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 bg-gray-900 text-white rounded-lg p-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-lg">Combined Package</h4>
                <p className="text-sm text-gray-300">Homepage Banner + Newsletter Sponsorship</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">$400/mo</span>
                <p className="text-sm text-gray-300">Save $50/month</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-900 pt-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-900">Ready to reach our audience?</p>
              <p className="text-sm text-gray-600">alex@trylaunch.ai • trylaunch.ai/advertise</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Updated January 2025</p>
              <p>Data source: Google Analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
};

export default MediaKit;
