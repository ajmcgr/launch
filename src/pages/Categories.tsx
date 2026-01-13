import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

interface Category {
  id: number;
  name: string;
  slug: string;
}

const createSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');
      
      if (data) {
        setCategories(data.map(c => ({ ...c, slug: createSlug(c.name) })));
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  // Simple random sizing for visual interest
  const getSizeClass = (index: number) => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
    return sizes[index % sizes.length];
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Popular Categories | Launch</title>
        <meta name="description" content="Browse popular product categories and discover products by category" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Popular Categories</h1>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading categories...</div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className={`${getSizeClass(index)} px-4 py-2 rounded-full border transition-all hover:scale-105 border-border text-muted-foreground hover:text-primary hover:border-primary`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
