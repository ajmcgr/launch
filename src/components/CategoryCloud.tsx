import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const createSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export const CategoryCloud = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['category-cloud'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');
      return (data || []).map(c => ({ ...c, slug: createSlug(c.name) }));
    },
    staleTime: 1000 * 60 * 10,
  });

  const getSizeClass = (index: number) => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
    return sizes[index % sizes.length];
  };

  if (isLoading) {
    return (
      <section className="py-6 bg-background">
        <Skeleton className="h-7 w-64 mb-8" />
        <div className="flex flex-wrap justify-start gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-6 bg-background">
      <h2 className="text-2xl font-bold text-left mb-8">Browse by Category</h2>
      <div className="flex flex-wrap justify-start gap-3">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            to={`/category/${category.slug}`}
            className={`${getSizeClass(index)} px-4 py-2 rounded-full border border-border text-nav-text hover:text-primary hover:border-primary transition-all hover:scale-105`}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  );
};
