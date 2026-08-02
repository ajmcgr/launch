import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock } from 'lucide-react';
import {
  categoryOf,
  authorOf,
  readTime,
  isUpdated,
  cardImage,
  type BlogPostRecord,
} from '@/lib/blog/post';

interface Props {
  post: BlogPostRecord;
  variant?: 'featured' | 'default' | 'compact';
}

export const BlogCard = ({ post, variant = 'default' }: Props) => {
  const category = categoryOf(post);
  const author = authorOf(post);
  const minutes = readTime(post);
  const updated = isUpdated(post);
  const image = cardImage(post);

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="text-foreground/80">{author.name}</span>
      <span aria-hidden>·</span>
      {post.published_at && (
        <>
          <time dateTime={post.published_at}>
            {format(new Date(post.published_at), 'MMM d, yyyy')}
          </time>
          <span aria-hidden>·</span>
        </>
      )}
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" aria-hidden /> {minutes} min read
      </span>
      {!!post.view_count && post.view_count > 50 && (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" aria-hidden /> {post.view_count.toLocaleString()}
          </span>
        </>
      )}
    </div>
  );

  const badges = (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <Badge variant="secondary" className="text-[11px] font-normal">
        {category.name}
      </Badge>
      {updated && (
        <Badge variant="outline" className="text-[11px] font-normal">
          Updated
        </Badge>
      )}
    </div>
  );

  if (variant === 'compact') {
    return (
      <Link to={`/blog/${post.slug}`} className="group flex gap-4 items-start">
        {image && (
          <div className="hidden sm:block w-24 h-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            <img
              src={image}
              alt={post.title}
              loading="lazy"
              width={192}
              height={160}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            {category.name}
          </p>
          <h3 className="font-reckless text-lg leading-snug tracking-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          {meta}
        </div>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <Link to={`/blog/${post.slug}`} className="group block">
        <article className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
          {image && (
            <div className="md:col-span-7 aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
              <img
                src={image}
                alt={post.title}
                loading="eager"
                fetchPriority="high"
                width={1200}
                height={750}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
            </div>
          )}
          <div className={image ? 'md:col-span-5' : 'md:col-span-12'}>
            {badges}
            <h2 className="font-reckless text-3xl md:text-5xl leading-[1.1] tracking-tight mb-5 group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-5 line-clamp-3">
                {post.excerpt}
              </p>
            )}
            {meta}
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${post.slug}`} className="group block">
      <article>
        {image && (
          <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted mb-5">
            <img
              src={image}
              alt={post.title}
              loading="lazy"
              width={800}
              height={500}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
          </div>
        )}
        {badges}
        <h3 className="font-reckless text-2xl leading-[1.15] tracking-tight mb-3 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-[15px] text-muted-foreground leading-relaxed line-clamp-3 mb-4">
            {post.excerpt}
          </p>
        )}
        {meta}
      </article>
    </Link>
  );
};

export default BlogCard;
