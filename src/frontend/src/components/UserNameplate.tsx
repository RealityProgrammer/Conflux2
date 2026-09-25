import UserAvatar from "./UserAvatar.tsx";
import {type HTMLAttributes, type ReactNode} from "react";
import {random} from "animejs";
import type {PresenceStatus} from "../graphql/types.ts";
import {userService} from "../api/userService.ts";
import PresenceStatusIcon from "./PresenceStatusIcon.tsx";

interface UserNameplateProps extends HTMLAttributes<HTMLDivElement> {
  avatarSrc?: string;
  avatarAlt?: string;
  displayName: string;
  userName?: string;
  children?: ReactNode;
  presenceStatus?: PresenceStatus;
  presenceStatusClassName?: string;
}

function Root({
  avatarSrc,
  avatarAlt,
  userName,
  displayName,
  children,
  className,
  presenceStatus,
  presenceStatusClassName,
  ...props
}: UserNameplateProps) {
  return (
    <div className={`flex flex-row items-center gap-3 ${className ?? ""}`} {...props}>
      <div className="relative">
        <UserAvatar
          src={avatarSrc}
          alt={avatarAlt}
          className="flex-none size-8 cursor-pointer"
        />

        {presenceStatus && (
          <PresenceStatusIcon
            status={presenceStatus}
            className={`absolute bottom-0 right-0 translate-x-[10%] translate-y-[10%] rounded-full size-3 ${presenceStatusClassName}`}
          />
        )}
      </div>

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

function Skeleton({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-row items-center gap-3 ${className ?? ""}`} {...props}>
      <div
        className="flex-none min-h-8 aspect-square self-stretch h-auto select-none items-center justify-center overflow-hidden rounded-full align-middle bg-white/10 animate-pulse"/>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-4 rounded bg-white/10 animate-pulse" style={{width: `${random(144, 224)}px`}}/>
        <div className="h-4 rounded bg-white/10 animate-pulse mt-1" style={{width: `${random(80, 128)}px`}}/>
      </div>
    </div>
  );
}

export const UserNameplate = {
  Root,
  Skeleton,
};