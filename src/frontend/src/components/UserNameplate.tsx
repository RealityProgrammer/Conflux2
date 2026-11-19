import { type HTMLAttributes, type ReactNode } from "react";
import { random } from "animejs";
import { Avatar, type PresenceProps } from "./Avatar.tsx";
import usePositionBasedRandom from "../hooks/usePositionBasedRandom.ts";

interface RootProps extends HTMLAttributes<HTMLDivElement> {
  userId: string;
  avatarVersion: number | null | undefined;
  avatarAlt?: string;
  displayName: string;
  userName?: string;
  children?: ReactNode;
  presence?: PresenceProps;
}

function Root({
  userId,
  avatarVersion,
  avatarAlt,
  userName,
  displayName,
  children,
  className,
  presence,
  ...props
}: RootProps) {
  return (
    <div className={`flex flex-row items-center gap-3 ${className ?? ""}`} {...props}>
      <Avatar.User
        userId={userId}
        version={avatarVersion}
        alt={avatarAlt}
        className="size-8 flex-none cursor-pointer rounded-full"
        presence={presence}
      />

      <div className="flex min-w-0 flex-1 flex-col select-none">
        <p className="truncate text-sm">{displayName}</p>

        {userName && <p className="truncate text-sm text-gray-400">@{userName}</p>}
      </div>

      <div className="flex flex-none flex-row items-center gap-2">{children}</div>
    </div>
  );
}

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  showUserName?: boolean;
}

function Skeleton({ showUserName, className, ...props }: SkeletonProps) {
  const nameWidth = usePositionBasedRandom() * 75;

  return (
    <div className={`flex flex-row items-center gap-3 ${className ?? ""}`} {...props}>
      <div className="aspect-square h-auto min-h-8 flex-none animate-pulse items-center justify-center self-stretch overflow-hidden rounded-full bg-white/10 align-middle select-none" />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-4 animate-pulse rounded bg-white/10" style={{ width: `${nameWidth}%` }} />

        {showUserName && (
          <div
            className="mt-1 h-4 animate-pulse rounded bg-white/10"
            style={{ width: `${random(80, 128)}px` }}
          />
        )}
      </div>
    </div>
  );
}

export const UserNameplate = {
  Root,
  Skeleton,
};
