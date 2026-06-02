import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  listCollaborators,
  inviteCollaboratorByUsername,
  removeCollaborator,
  type CollaboratorInfo,
} from '@/hooks/use-collections';

interface Props {
  collectionId: string;
}

export const CollectionCollaboratorsPanel = ({ collectionId }: Props) => {
  const [list, setList] = useState<CollaboratorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [inviting, setInviting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setList(await listCollaborators(collectionId));
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [collectionId]);

  const handleInvite = async () => {
    if (!username.trim()) return;
    setInviting(true);
    const res = await inviteCollaboratorByUsername(collectionId, username);
    setInviting(false);
    if (res.ok) {
      toast.success(`Invited @${username.trim().replace(/^@/, '')}`);
      setUsername('');
      refresh();
    } else {
      toast.error(res.error ?? 'Could not invite');
    }
  };

  const handleRemove = async (userId: string, name: string | null) => {
    if (!confirm(`Remove ${name ? `@${name}` : 'this collaborator'}?`)) return;
    try {
      await removeCollaborator(collectionId, userId);
      toast.success('Removed');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" /> Collaborators
      </div>
      <p className="text-xs text-muted-foreground">
        Invited users can add launches to this collection. Only you can remove them or edit settings.
      </p>

      <div className="flex gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
          onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
        />
        <Button onClick={handleInvite} size="sm" disabled={inviting || !username.trim()}>
          <UserPlus className="h-4 w-4 mr-1" /> Invite
        </Button>
      </div>

      <div className="space-y-1 max-h-40 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-xs text-muted-foreground">No collaborators yet.</p>
        ) : (
          list.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
              <Avatar className="h-6 w-6">
                {c.avatar_url && <AvatarImage src={c.avatar_url} alt={c.username ?? ''} />}
                <AvatarFallback className="text-[10px]">{(c.username ?? '?').slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm flex-1 truncate">@{c.username ?? 'unknown'}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemove(c.user_id, c.username)}
                aria-label="Remove collaborator"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CollectionCollaboratorsPanel;
