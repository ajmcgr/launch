import { Button } from '@/components/ui/button';
import { Mail, MessageSquare } from 'lucide-react';
import { TrustPhrase } from '@/hooks/use-member-count';

export const CommunityCallout = () => {
  return (
    <div className="w-full bg-muted/30 px-6 flex items-center aspect-[7/1]">
      <div className="w-full flex flex-col md:flex-row gap-4 items-center justify-center">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-semibold mb-1">Join the Community</h3>
          <TrustPhrase className="text-sm text-muted-foreground" />
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
    </div>
  );
};
