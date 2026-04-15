import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyProductComment } from '@/lib/notifications';

interface CommentFormProps {
  productId: string;
  onCommentAdded: () => void;
  parentCommentId?: string;
  onCancel?: () => void;
}

export const CommentForm = ({ productId, onCommentAdded, parentCommentId, onCancel }: CommentFormProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();

      if (userData?.username) {
        notifyProductComment(productId, userData.username);
      }

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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-2">
      <input
        ref={inputRef}
        type="text"
        placeholder={parentCommentId ? "Write a reply..." : "Add a comment..."}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={1000}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
      <Button
        type="submit"
        disabled={isSubmitting || !content.trim()}
        size="sm"
        className="rounded-full h-8 px-4 text-xs font-semibold"
      >
        {isSubmitting ? '...' : 'Post'}
      </Button>
    </form>
  );
};
