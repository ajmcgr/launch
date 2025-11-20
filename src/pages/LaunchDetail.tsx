import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, ExternalLink, Calendar } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const LaunchDetail = () => {
  const { slug } = useParams();

  // Mock data - in production, fetch from database
  const product = {
    id: '1',
    slug: 'ai-assistant-pro',
    name: 'AI Assistant Pro',
    tagline: 'Your intelligent productivity companion',
    description: 'AI Assistant Pro is a cutting-edge productivity tool that leverages advanced artificial intelligence to help you manage your daily tasks, schedule meetings, and optimize your workflow. With natural language processing and machine learning capabilities, it understands your needs and provides personalized assistance.',
    url: 'https://example.com',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
    screenshots: [
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    ],
    categories: ['Productivity', 'AI Agents', 'Engineering & Development'],
    launchDate: '2024-01-15',
    netVotes: 142,
    userVote: null as 1 | -1 | null,
    makers: [
      { username: 'alexdoe', avatar_url: '', bio: 'Founder & CEO' },
    ],
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <img 
                src={product.thumbnail} 
                alt={product.name}
                className="w-full aspect-video object-cover"
              />
            </Card>

            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
                  <p className="text-xl text-muted-foreground">{product.tagline}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {product.categories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 border rounded-lg p-2">
                  <Button
                    size="sm"
                    variant={product.userVote === 1 ? 'default' : 'outline'}
                    className="h-10 w-10 p-0"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                  <span className="font-bold text-lg min-w-[3rem] text-center">
                    {product.netVotes}
                  </span>
                  <Button
                    size="sm"
                    variant={product.userVote === -1 ? 'destructive' : 'outline'}
                    className="h-10 w-10 p-0"
                  >
                    <ArrowDown className="h-5 w-5" />
                  </Button>
                </div>

                <Button size="lg" asChild>
                  <a href={product.url} target="_blank" rel="noopener noreferrer">
                    Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Calendar className="h-4 w-4" />
                <span>Launched on {new Date(product.launchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </Card>

            {product.screenshots.length > 0 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Screenshots</h2>
                <Carousel className="w-full">
                  <CarouselContent>
                    {product.screenshots.map((screenshot, index) => (
                      <CarouselItem key={index}>
                        <img
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full rounded-lg"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Makers</h2>
              <div className="space-y-4">
                {product.makers.map((maker) => (
                  <Link
                    key={maker.username}
                    to={`/u/${maker.username}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={maker.avatar_url} alt={maker.username} />
                      <AvatarFallback>{maker.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">@{maker.username}</p>
                      {maker.bio && (
                        <p className="text-sm text-muted-foreground truncate">
                          {maker.bio}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchDetail;
