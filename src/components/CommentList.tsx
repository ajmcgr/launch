import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeAgo } from '@/lib/formatTime';
import { CommentForm } from './CommentForm';
import { Heart, MessageCircle, Pin, PinOff, Trash2, MoreHorizontal } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

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

      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      data?.forEach((comment: any) => {
        if (!comment.user || !comment.user.username) return;
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      commentMap.forEach((commentObj, commentId) => {
        const originalComment = data?.find((c: any) => c.id === commentId);
        if (originalComment?.parent_comment_id) {
          const parent = commentMap.get(originalComment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(commentObj);
          } else {
            rootComments.push(commentObj);
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

  const totalCommentCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  const sortedComments = [...comments].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const username = comment.user?.username || 'Unknown';
    const avatarUrl = comment.user?.avatar_url || '';
    const isOwner = comment.user_id === productOwnerId;
    const canModerate = isProductOwner || user?.id === comment.user_id;

    return (
      <div className={`group ${isReply ? 'ml-10 sm:ml-12' : ''}`}>
        <div className="flex gap-3">
          <Link to={`/@${username}`} className="flex-shrink-0 mt-0.5">
            <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary/40 transition-all">
              <AvatarImage src={avatarUrl} alt={username} />
              <AvatarFallback className="text-xs">{username[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link to={`/@${username}`} className="text-sm font-semibold hover:text-primary transition-colors">
                {username}
              </Link>
              {isOwner && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  OP
                </span>
              )}
              {comment.pinned && (
                <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium">
                  <Pin className="h-2.5 w-2.5" />
                  Pinned
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(comment.created_at)}
              </span>

              {/* Overflow menu for pin/delete */}
              {canModerate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    {isProductOwner && !isReply && (
                      <DropdownMenuItem onClick={() => handlePinComment(comment.id, comment.pinned)}>
                        {comment.pinned ? (
                          <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</>
                        ) : (
                          <><Pin className="h-3.5 w-3.5 mr-2" /> Pin</>
                        )}
                      </DropdownMenuItem>
                    )}
                    {user?.id === comment.user_id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
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
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words leading-relaxed">
              {comment.content}
            </p>

            {/* Action row */}
            <div className="flex items-center gap-4 mt-2">
              {user && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Reply
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline reply form */}
        {replyingTo === comment.id && (
          <div className="ml-11 sm:ml-11 mt-3">
            <CommentForm
              productId={productId}
              parentCommentId={comment.id}
              onCommentAdded={handleReplyAdded}
              onCancel={() => setReplyingTo(null)}
            />
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-4">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with count and sort */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold">Comments ({totalCommentCount})</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSortBy('newest')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              sortBy === 'newest' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortBy('oldest')}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              sortBy === 'oldest' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Oldest
          </button>
        </div>
      </div>

      {/* Comment list — clean, no borders between items */}
      <div className="space-y-5">
        {sortedComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};
