import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/lib/constants';

const createSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export const CategoryCloud = () => {
  // Simple random sizing for visual interest
  const getSizeClass = (index: number) => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
    return sizes[index % sizes.length];
  };

  return (
    <section className="py-6 bg-background">
      <h2 className="text-2xl font-bold text-left mb-8">Browse by Category</h2>
      <div className="flex flex-wrap justify-start gap-3">
        {CATEGORIES.map((category, index) => (
          <Link
            key={category}
            to={`/category/${createSlug(category)}`}
            className={`${getSizeClass(index)} px-4 py-2 rounded-full border border-border text-nav-text hover:text-primary hover:border-primary transition-all hover:scale-105`}
          >
            {category}
          </Link>
        ))}
      </div>
    </section>
  );
};
