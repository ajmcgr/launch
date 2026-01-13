import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeAgo } from '@/lib/formatTime';
import { CommentForm } from './CommentForm';
import { Pin, PinOff, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  pinned: boolean;
  user_id: string;
  user: {
    username: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

interface CommentListProps {
  productId: string;
  productOwnerId?: string;
  refreshTrigger?: number;
}

export const CommentList = ({ productId, productOwnerId, refreshTrigger }: CommentListProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const isProductOwner = user?.id === productOwnerId;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    fetchComments();
  }, [productId, refreshTrigger]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          parent_comment_id,
          pinned,
          user_id,
          user:users (
            username,
            avatar_url
          )
        `)
        .eq('product_id', productId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Organize comments into parent-child structure
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      // First pass: create all comment objects
      data?.forEach((comment: any) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      // Second pass: organize into tree structure
      data?.forEach((comment: any) => {
        const commentObj = commentMap.get(comment.id)!;
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(commentObj);
          }
        } else {
          rootComments.push(commentObj);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplyAdded = () => {
    setReplyingTo(null);
    fetchComments();
  };

  const handlePinComment = async (commentId: string, currentlyPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ pinned: !currentlyPinned })
        .eq('id', commentId);

      if (error) throw error;

      toast.success(currentlyPinned ? 'Comment unpinned' : 'Comment pinned');
      fetchComments();
    } catch (error) {
      console.error('Error pinning comment:', error);
      toast.error('Failed to update pin status');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comment deleted');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`p-4 ${isReply ? 'ml-8 mt-3 border-l-2 border-muted' : 'border rounded-lg bg-card'} ${comment.pinned && !isReply ? 'border-primary/50 bg-primary/5' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={comment.user.avatar_url} alt={comment.user.username} />
          <AvatarFallback>{comment.user.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">@{comment.user.username}</span>
            {comment.pinned && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{comment.content}</p>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="h-8 text-xs"
              >
                Reply
              </Button>
            )}
            {isProductOwner && !isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePinComment(comment.id, comment.pinned)}
                className="h-8 text-xs gap-1"
              >
                {comment.pinned ? (
                  <>
                    <PinOff className="h-3 w-3" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-3 w-3" />
                    Pin
                  </>
                )}
              </Button>
            )}
            {user?.id === comment.user_id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your comment.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
      {replyingTo === comment.id && (
        <div className="mt-3">
          <CommentForm
            productId={productId}
            parentCommentId={comment.id}
            onCommentAdded={handleReplyAdded}
            onCancel={() => setReplyingTo(null)}
          />
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2 mt-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading comments...</p>
      </Card>
    );
  }

  if (comments.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
};
