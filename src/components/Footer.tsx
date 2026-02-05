import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Instagram, Youtube } from 'lucide-react';

// Custom X (Twitter) icon
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Custom Telegram icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// Custom Reddit icon
const RedditIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

const createSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export const Footer = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug')
        .eq('status', 'launched')
        .not('name', 'is', null)
        .not('slug', 'is', null)
        .order('launch_date', { ascending: false })
        .limit(30);
      
      if (data) {
        setProducts(data as Product[]);
      }
    };

    const fetchCategories = async () => {
      const { data } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');
      
      if (data) {
        setCategories(data.map(c => ({ ...c, slug: createSlug(c.name) })));
      }
    };

    fetchProducts();
    fetchCategories();
  }, []);

  return (
    <footer className="bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Products Section */}
        {products.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-foreground">Popular Products</h3>
            <div className="flex flex-wrap gap-2">
              {products.slice(0, 30).map((product) => (
                <Link
                  key={product.id}
                  to={`/launch/${product.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {product.name}
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Link 
                to="/products" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                More →
              </Link>
            </div>
          </div>
        )}

        {/* Categories Section */}
        {categories.length > 0 && (
          <div className="mb-8 pt-6 border-t">
            <h3 className="font-semibold mb-4 text-foreground">Popular Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 30).map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {category.name}
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Link 
                to="/categories" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                More →
              </Link>
            </div>
          </div>
        )}

        {/* Footer Links - full width border */}
      </div>
      <div className="border-t">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-8">
          <div>
            <h3 className="font-semibold mb-4 text-foreground">About</h3>
            <ul className="space-y-1">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Support</h3>
            <ul className="space-y-1">
              <li>
                <a 
                  href="mailto:alex@trylaunch.ai"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Resources</h3>
            <ul className="space-y-1">
              <li>
                <Link 
                  to="/advertise"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Advertise
                </Link>
              </li>
              <li>
                <Link 
                  to="/media-kit"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Media Kit
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Connect</h3>
            <ul className="space-y-1">
              <li>
                <a 
                  href="https://x.com/trylaunchai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <XIcon className="h-4 w-4" />
                  X
                </a>
              </li>
              <li>
                <a 
                  href="https://t.me/trylaunch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <TelegramIcon className="h-4 w-4" />
                  Telegram
                </a>
              </li>
              <li>
                <a 
                  href="https://www.reddit.com/r/TryLaunch/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <RedditIcon className="h-4 w-4" />
                  Reddit
                </a>
              </li>
              <li>
                <a 
                  href="https://instagram.com/trylaunch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </li>
              <li>
                <a 
                  href="https://www.youtube.com/channel/UCiWIdnazQN7JqkioVROrblQ/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <Youtube className="h-4 w-4" />
                  YouTube
                </a>
              </li>
            </ul>
          </div>
          </div>
          <div className="pb-8 text-center text-sm text-muted-foreground">
          <p>
            Copyright © {new Date().getFullYear()} Works App, Inc. Built with 🫶🏻 by{' '}
            <a 
              href="https://x.com/alexmacgregor__" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Alex
            </a>{' '}and{' '}
            <a 
              href="https://works.xyz/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Works
            </a>.
          </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
