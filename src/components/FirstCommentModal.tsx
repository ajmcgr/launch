import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

interface FirstCommentModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  userId: string;
}

const EXAMPLE_PROMPTS = [
  'Roast my landing page',
  'Pricing feedback',
  'Feature ideas',
  'Would you pay for this?',
];

export const FirstCommentModal = ({
  open,
  onClose,
  productId,
  productName,
  userId,
}: FirstCommentModalProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('comments').insert({
        product_id: productId,
        user_id: userId,
        content: content.trim(),
      });

      if (error) throw error;

      toast.success('First comment posted! 🎉');
      onClose();
    } catch (error) {
      console.error('Error posting first comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-5 w-5 text-primary" />
            <DialogTitle>Start the conversation</DialogTitle>
          </div>
          <DialogDescription>
            Launches with an initial discussion get more feedback from the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="What feedback are you looking for?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
            maxLength={1000}
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setContent(prompt)}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Skip
            </Button>
            <Button onClick={handlePost} disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? 'Posting...' : 'Post first comment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
