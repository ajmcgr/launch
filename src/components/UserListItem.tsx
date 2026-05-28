import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    name: string | null;
  };
}

export function UserListItem({ user }: Props) {
  return (
    <Link
      to={`/@${user.username}`}
      className="flex items-center gap-4 py-3 group"
    >
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
        <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          {user.name && (
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {user.name}
            </span>
          )}
          <span className="text-sm text-muted-foreground">@{user.username}</span>
        </div>
        {user.bio && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{user.bio}</p>
        )}
      </div>
    </Link>
  );
}
