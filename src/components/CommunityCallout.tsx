import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare } from 'lucide-react';

export const CommunityCallout = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card className="p-6 bg-muted/30 border-0">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-semibold mb-1">Join the Community</h3>
            <p className="text-sm text-muted-foreground">
              Stay updated with weekly launches and connect with other makers
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="gap-2">
              <a href="https://newsletter.trylaunch.ai/" target="_blank" rel="noopener noreferrer">
                <Mail className="h-4 w-4" />
                Subscribe to Newsletter
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <a href="https://forums.trylaunch.ai/" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4" />
                Join Forums
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
