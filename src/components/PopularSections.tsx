import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

interface StackItem {
  id: number;
  name: string;
  slug: string;
}

const createSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export const PopularSections = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stackItems, setStackItems] = useState<StackItem[]>([]);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Defer all data fetching until the section is near the viewport.
  // PopularSections lives near the footer so this avoids three extra
  // network round-trips on initial homepage load.
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const fetchAll = async () => {
      const [productsRes, categoriesRes, stackRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, slug')
          .eq('status', 'launched')
          .not('name', 'is', null)
          .not('slug', 'is', null)
          .order('launch_date', { ascending: false })
          .limit(30),
        supabase.from('product_categories').select('id, name').order('name'),
        supabase.from('stack_items').select('id, name, slug').order('name').limit(30),
      ]);

      if (cancelled) return;

      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (categoriesRes.data) {
        setCategories(categoriesRes.data.map((c) => ({ ...c, slug: createSlug(c.name) })));
      }
      if (stackRes.data) setStackItems(stackRes.data);
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <div ref={ref} className="py-6 space-y-8 min-h-[200px]">
      {products.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4 text-foreground">Popular Launches</h3>
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
            <Link to="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              More →
            </Link>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="pt-6 border-t border-border">
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
            <Link to="/categories" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              More →
            </Link>
          </div>
        </div>
      )}

      {stackItems.length > 0 && (
        <div className="pt-6 border-t border-border">
          <h3 className="font-semibold mb-4 text-foreground">Popular Tech</h3>
          <div className="flex flex-wrap gap-2">
            {stackItems.slice(0, 30).map((item) => (
              <Link
                key={item.id}
                to={`/tech/${item.slug}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="mt-4">
            <Link to="/tech" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              More →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
