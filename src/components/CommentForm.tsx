import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CommentFormProps {
  productId: string;
  onCommentAdded: () => void;
  parentCommentId?: string;
  onCancel?: () => void;
}

export const CommentForm = ({ productId, onCommentAdded, parentCommentId, onCancel }: CommentFormProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please login to comment');
        return;
      }

      const { error } = await supabase
        .from('comments')
        .insert({
          product_id: productId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentCommentId || null,
        });

      if (error) throw error;

      setContent('');
      toast.success(parentCommentId ? 'Reply added!' : 'Comment added!');
      onCommentAdded();
      if (onCancel) onCancel();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder={parentCommentId ? "Write a reply..." : "Share your thoughts..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
          maxLength={1000}
        />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {content.length}/1000
          </span>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? 'Posting...' : (parentCommentId ? 'Post Reply' : 'Post Comment')}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
};
