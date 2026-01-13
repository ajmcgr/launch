import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

const Tags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from('product_tags')
        .select('id, name, slug, description')
        .order('name');
      
      if (data) {
        setTags(data);
      }
      setLoading(false);
    };

    fetchTags();
  }, []);

  // Simple random sizing for visual interest
  const getSizeClass = (index: number) => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
    return sizes[index % sizes.length];
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Popular Products | Launch</title>
        <meta name="description" content="Browse popular product tags and discover products by topic" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Popular Products</h1>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading tags...</div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            {tags.map((tag, index) => (
              <Link
                key={tag.id}
                to={`/tag/${tag.slug}`}
                className={`${getSizeClass(index)} px-4 py-2 rounded-full border transition-all hover:scale-105 border-border text-muted-foreground hover:text-primary hover:border-primary`}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tags;
