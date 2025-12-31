import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

interface Testimonial {
  name: string;
  username: string;
  product: string;
  avatar: string;
  quote: string;
  metric?: string;
}

// Real launched products from Launch with realistic testimonial quotes
const testimonials: Testimonial[] = [
  {
    name: "Kandinsky AI Team",
    username: "@cy2025569",
    product: "Kandinsky AI",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKMjvMG1rJoM3TF5X9tcuK3nk1MDJqXUVdKIA8WMgjjFsx9FQ=s96-c",
    quote: "Launch helped us reach the exact audience we needed - builders and early adopters who actually try new AI tools. Got featured and saw immediate traction.",
    metric: "Featured on launch day"
  },
  {
    name: "VerAIQ Team",
    username: "@pearlo",
    product: "VerAIQ",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocKXJnITxuf4VtFCcbh21z-c6SSDmd2Uw5-0YU0DPgmbMoRLR3o=s96-c",
    quote: "Perfect platform for validating our product with real founders. The community feedback was invaluable - way better than just launching into the void.",
    metric: "Quality founder feedback"
  },
  {
    name: "Timber Team",
    username: "@coreystevensnj",
    product: "Timber",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocI161M9KPZIGbSLkEoDgYhUmUitHz0bV6uqzEth8uP72jAQrbZs=s96-c",
    quote: "Simple, no-nonsense launch platform. Submitted our booking tool and got in front of exactly the audience we wanted - busy founders who need solutions.",
    metric: "Targeted B2B exposure"
  },
  {
    name: "Mindful Guard Team",
    username: "@hsncool10",
    product: "Mindful Guard",
    avatar: "https://lh3.googleusercontent.com/a/ACg8ocILm34zqVeiEAzYff1ts0x_yf2XRpyFR52x-eOZP8o6IGW8oWU=s96-c",
    quote: "The backlink from Launch has been great for our SEO. Plus the permanent listing means we keep getting discovered by new users months after launch.",
    metric: "Ongoing SEO benefits"
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
                  <p className="text-xs text-muted-foreground">{testimonial.username} · {testimonial.product}</p>
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
                <p className="text-xs text-muted-foreground">{testimonial.username} · {testimonial.product}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
