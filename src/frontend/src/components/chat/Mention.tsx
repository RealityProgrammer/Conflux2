import {useUserIdentityStore} from "../../store/useUserIdentityStore.ts";
import {useEffect} from "react";

interface MentionProps {
  userId: string;
  fallbackDisplayName?: string | null;
  className?: string;
}

export default function Mention({
  userId,
  fallbackDisplayName,
  className,
  ...props
}: MentionProps) {
  const user = useUserIdentityStore((state) => state.getUser(userId));
  const fetchUser = useUserIdentityStore((state) => state.fetchUser);

  useEffect(() => {
    if (!user && userId) {
      fetchUser(userId);
    }
  }, [userId, userId, fetchUser]);

  const displayName = user?.displayName || fallbackDisplayName || `user_${userId}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-400/25 hover:bg-blue-400/60 font-semibold text-blue-100 cursor-default text-sm rounded-md ${className}`}
      {...props}
    >
      @{displayName}
    </span>
  )
}