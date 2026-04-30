import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

interface Item {
  id: number | string;
  name: string;
  slug: string;
}

const createSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const Categories = () => {
  const [categories, setCategories] = useState<Item[]>([]);
  const [tags, setTags] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [catRes, tagRes] = await Promise.all([
        supabase
          .from('product_categories')
          .select('id, name')
          .order('name')
          .limit(2000),
        supabase
          .from('product_tags')
          .select('id, name, slug')
          .order('name')
          .limit(2000),
      ]);

      if (catRes.data) {
        setCategories(catRes.data.map((c: any) => ({ ...c, slug: createSlug(c.name) })));
      }
      if (tagRes.data) {
        setTags(tagRes.data as Item[]);
      }
      setLoading(false);
    };

    fetchAll();
  }, []);

  const getSizeClass = (index: number) => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
    return sizes[index % sizes.length];
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>All Categories & Tags | Launch</title>
        <meta name="description" content="Browse every category and tag on Launch — discover products across the full taxonomy of indie maker tools." />
        <link rel="canonical" href="https://trylaunch.ai/categories" />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <h1 className="text-4xl font-bold mb-2 text-center font-reckless">All Categories</h1>
        <p className="text-center text-muted-foreground mb-10">
          Browse the complete taxonomy of products on Launch.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 rounded-full border-2 border-muted border-t-primary animate-spin" aria-label="Loading" />
          </div>
        ) : (
          <>
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">
                Categories <span className="text-muted-foreground text-base font-normal">({categories.length})</span>
              </h2>
              <div className="flex flex-wrap justify-start gap-3">
                {categories.map((category, index) => (
                  <Link
                    key={`cat-${category.id}`}
                    to={`/category/${category.slug}`}
                    className={`${getSizeClass(index)} px-4 py-2 rounded-full border transition-all hover:scale-105 border-border text-muted-foreground hover:text-primary hover:border-primary`}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </section>

            {tags.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-6">
                  Tags <span className="text-muted-foreground text-base font-normal">({tags.length})</span>
                </h2>
                <div className="flex flex-wrap justify-start gap-2">
                  {tags.map((tag, index) => (
                    <Link
                      key={`tag-${tag.id}`}
                      to={`/tag/${tag.slug}`}
                      className={`${getSizeClass(index)} px-3 py-1.5 rounded-full border transition-all hover:scale-105 border-border text-muted-foreground hover:text-primary hover:border-primary`}
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Categories;
