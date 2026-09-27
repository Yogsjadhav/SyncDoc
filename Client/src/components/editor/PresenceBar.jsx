import Avatar from '../ui/Avatar';
import { useDocumentStore } from '../../store/documentStore';
import { useAuthStore } from '../../store/authStore';

export default function PresenceBar() {
  const presence = useDocumentStore((s) => s.presence);
  const currentUserId = useAuthStore((s) => s.user?._id);

  // Exclude self
  const others = Array.from(presence.values()).filter((u) => u.userId !== currentUserId);

  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-2" aria-label={`${others.length} other ${others.length === 1 ? 'person' : 'people'} editing`}>
      <div className="flex -space-x-2">
        {others.slice(0, 5).map((u) => (
          <Avatar key={u.userId} name={u.name} color={u.avatarColor} size="sm"
            title={u.name} className="ring-2 ring-white" />
        ))}
        {others.length > 5 && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200
            text-xs font-medium text-gray-600 ring-2 ring-white">
            +{others.length - 5}
          </span>
        )}
      </div>
      <span className="hidden text-xs text-gray-500 sm:inline">
        {others.length} {others.length === 1 ? 'person' : 'people'} editing
      </span>
    </div>
  );
}
