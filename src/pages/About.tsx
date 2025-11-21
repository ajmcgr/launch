import founderPhoto from '@/assets/founder-photo.png';

const About = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="border border-border rounded-lg p-8 md:p-12 bg-card">
          <h1 className="text-4xl font-bold mb-8 text-center">About Launch</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-lg">
              Launch is a platform where founders and makers discover and launch amazing products.
              We're building a community that celebrates innovation and helps great products get the
              attention they deserve.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Our Mission</h2>
            <p>
              We believe that every great product deserves to be discovered. Our mission is to connect
              innovative makers with engaged audiences, helping products reach the people who will love them.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">How It Works</h2>
            <p>
              Founders submit their products through our simple launch wizard, choosing when they want to
              go live. The community then votes on products they find interesting, helping the best
              products rise to the top.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">Join the Community</h2>
            <p>
              Whether you're launching your first product or discovering your next favorite tool,
              Launch is the place to be. Join thousands of founders and tech enthusiasts who
              are shaping the future of product discovery.
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
  );
};

export default About;
