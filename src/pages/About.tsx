import { Helmet } from 'react-helmet-async';
import founderPhoto from '@/assets/founder-photo.png';

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Launch - Home of Vibe Coders</title>
        <meta name="description" content="Launch is a platform where vibe coders discover and launch AI products. We're building the home for the next generation of builders." />
        <link rel="canonical" href="https://trylaunch.ai/about" />
        <meta property="og:title" content="About Launch - Home of Vibe Coders" />
        <meta property="og:description" content="Launch is a platform where vibe coders discover and launch AI products." />
        <meta property="og:url" content="https://trylaunch.ai/about" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is Launch?",
              "acceptedAnswer": { "@type": "Answer", "text": "Launch is a platform where vibe coders discover and launch AI products. The community votes on what they find interesting, helping the best products rise to the top." }
            },
            {
              "@type": "Question",
              "name": "How do I launch my product?",
              "acceptedAnswer": { "@type": "Answer", "text": "Vibe coders submit their AI products through a simple launch wizard, choosing when they want to go live. The community then votes on products and provides feedback." }
            },
            {
              "@type": "Question",
              "name": "Who founded Launch?",
              "acceptedAnswer": { "@type": "Answer", "text": "Launch was founded by Alex MacGregor to help vibe coders get discovered and connect builders with engaged audiences." }
            }
          ]
        })}</script>
      </Helmet>
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="border border-border rounded-lg p-8 md:p-12 bg-card">
          <h1 className="text-4xl font-bold mb-8 text-center">About Launch</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-lg">
              Launch is a platform where vibe coders discover and launch AI products.
            </p>

            <p>
              <strong>Hello there!</strong>
            </p>

            <p>
              We believe the future of software is being built by vibe coders — people who use AI to
              ship products at a speed that was impossible just a few years ago. Our mission is to
              help these builders get discovered, earn reputation, and find their audience.
            </p>

            <p>
              Vibe coders submit their AI products through our simple launch wizard, choosing when they want to
              go live. The community then votes on what they find interesting, helping the best
              products rise to the top.
            </p>

            <p>
              Whether you're shipping your first AI tool or hunting for the next product that
              changes how you work, Launch is where vibe coders gather. Join thousands of builders
              who are redefining what it means to create software.
            </p>

            <div className="mt-12">
              <div className="flex flex-col items-start">
                <img 
                  src={founderPhoto} 
                  alt="Alex MacGregor" 
                  className="w-32 h-32 object-cover mb-4"
                />
                <h3 className="text-lg font-bold mb-0">Alex MacGregor</h3>
                <p className="text-lg font-bold mb-4">Founder, Launch</p>
                <a 
                  href="https://x.com/alexmacgregor__/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Follow me on X
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default About;
