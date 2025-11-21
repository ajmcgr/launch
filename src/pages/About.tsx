import founderPhoto from '@/assets/founder-photo.png';
import { Linkedin } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">About Launch</h1>
        
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

          <div className="mt-12 pt-8 border-t">
            <div className="flex flex-col items-center text-center">
              <img 
                src={founderPhoto} 
                alt="Alex MacGregor" 
                className="w-48 h-48 rounded-full object-cover mb-6"
              />
              <h3 className="text-2xl font-bold mb-1">Alex MacGregor</h3>
              <p className="text-lg text-muted-foreground mb-4">Founder, Media AI</p>
              <a 
                href="https://www.linkedin.com/in/alexmacgregor/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Linkedin className="w-5 h-5" />
                Connect with me on LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
