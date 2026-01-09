import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Tag {
  id: number;
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
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from('product_tags')
        .select('id, name, slug')
        .order('name');
      
      if (data) {
        setTags(data);
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

    fetchTags();
    fetchCategories();
  }, []);

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Tags Section */}
        {tags.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-foreground">Popular Products</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Categories Section */}
        {categories.length > 0 && (
          <div className="mb-8 pt-6 border-t">
            <h3 className="font-semibold mb-4 text-foreground">Popular Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-6 border-t">
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
              <li>
                <a 
                  href="https://newsletter.trylaunch.ai/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Newsletter
                </a>
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
                  Support
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
            <h3 className="font-semibold mb-4 text-foreground">Advertise</h3>
            <ul className="space-y-1">
              <li>
                <Link 
                  to="/advertise"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Display
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:alex@trymedia.ai"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Managed
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Connect</h3>
            <ul className="space-y-1">
              <li>
                <a 
                  href="https://forums.trylaunch.ai/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forums
                </a>
              </li>
              <li>
                <a 
                  href="https://x.com/trylaunchai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  X
                </a>
              </li>
              <li>
                <a 
                  href="https://t.me/trylaunch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Telegram
                </a>
              </li>
              <li>
                <a 
                  href="https://www.reddit.com/r/TryLaunch/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Reddit
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
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
    </footer>
  );
};
