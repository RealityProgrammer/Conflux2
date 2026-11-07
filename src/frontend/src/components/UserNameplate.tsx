import {type HTMLAttributes, type ReactNode} from "react";
import {random} from "animejs";
import {Avatar, type PresenceProps} from "./Avatar.tsx";
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
        className="flex-none size-8 cursor-pointer rounded-full"
        presence={presence}
      />

      <div className="flex-1 flex flex-col min-w-0 select-none">
        <p className="text-sm truncate">
          {displayName}
        </p>

        {userName && (<p className="text-sm text-gray-400 truncate">
          @{userName}
        </p>)}
      </div>

      <div className="flex-none flex flex-row items-center gap-2">
        {children}
      </div>
    </div>
  );
}

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  showUserName?: boolean;
}

function Skeleton({showUserName, className, ...props}: SkeletonProps) {
  const nameWidth = usePositionBasedRandom() * 75;

  return (
    <div className={`flex flex-row items-center gap-3 ${className ?? ""}`} {...props}>
      <div className="flex-none min-h-8 aspect-square self-stretch h-auto select-none items-center justify-center overflow-hidden rounded-full align-middle bg-white/10 animate-pulse"/>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-4 rounded bg-white/10 animate-pulse" style={{width: `${nameWidth}%`}}/>

        {showUserName && (
          <div className="h-4 rounded bg-white/10 animate-pulse mt-1" style={{width: `${random(80, 128)}px`}}/>
        )}
      </div>
    </div>
  );
}

export const UserNameplate = {
  Root,
  Skeleton,
};