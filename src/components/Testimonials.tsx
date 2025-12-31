import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  metric?: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Sarah Chen",
    role: "Founder",
    company: "AIWriteBot",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    quote: "Launch helped us get 500+ signups on our first day. The engaged audience here actually converts - not just tire kickers.",
    metric: "500+ signups in 24hrs"
  },
  {
    name: "Marcus Johnson",
    role: "CEO",
    company: "DevFlow",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
    quote: "We spent months trying to get traction. One week on Launch's sponsored spot brought more qualified leads than 3 months of ads.",
    metric: "3x more leads vs paid ads"
  },
  {
    name: "Emily Rodriguez",
    role: "Indie Maker",
    company: "ScreenShare Pro",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
    quote: "The newsletter sponsorship was a game-changer. Got featured to 2,000+ builders and saw immediate traffic spike.",
    metric: "2,000+ targeted impressions"
  },
  {
    name: "Alex Kim",
    role: "Co-founder",
    company: "DataPulse",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    quote: "Best ROI we've seen for product launches. The backlink alone was worth it for our SEO, but the community engagement was the real win.",
    metric: "Top 10 on launch day"
  }
];

interface TestimonialsProps {
  variant?: 'default' | 'compact';
  title?: string;
  subtitle?: string;
  maxItems?: number;
}

export const Testimonials = ({ 
  variant = 'default',
  title = "Trusted by Makers",
  subtitle = "Join hundreds of founders who've launched successfully",
  maxItems = 4
}: TestimonialsProps) => {
  const displayTestimonials = testimonials.slice(0, maxItems);

  if (variant === 'compact') {
    return (
      <section className="py-12">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {displayTestimonials.slice(0, 2).map((testimonial, index) => (
            <Card key={index} className="p-4 bg-muted/30 border-0">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground italic mb-2">"{testimonial.quote}"</p>
                  <p className="text-sm font-medium">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {displayTestimonials.map((testimonial, index) => (
          <Card key={index} className="p-6 bg-muted/30 border-0 flex flex-col">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground italic flex-1 mb-4">
              "{testimonial.quote}"
            </p>
            
            {testimonial.metric && (
              <div className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded mb-4 inline-block w-fit">
                {testimonial.metric}
              </div>
            )}
            
            <div className="flex items-center gap-3 mt-auto">
              <Avatar className="h-10 w-10">
                <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{testimonial.name}</p>
                <p className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
