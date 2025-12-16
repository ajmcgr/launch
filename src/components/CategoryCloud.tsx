import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/lib/constants';

export const CategoryCloud = () => {
  // Simple random sizing for visual interest
  const getSizeClass = (index: number) => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
    return sizes[index % sizes.length];
  };

  return (
    <section className="py-6 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">Browse by Category</h2>
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {CATEGORIES.map((category, index) => (
            <Link
              key={category}
              to={`/products?category=${encodeURIComponent(category)}`}
              className={`${getSizeClass(index)} px-4 py-2 rounded-full border border-border text-nav-text hover:text-primary hover:border-primary transition-all hover:scale-105`}
            >
              {category}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
