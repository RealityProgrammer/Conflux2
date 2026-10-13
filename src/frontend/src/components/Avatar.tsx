import {BsPeople, BsPerson} from "react-icons/bs";
import {Avatar as RadixAvatar} from "radix-ui";
import {userService} from "../api/userService.ts";
import {communityServerService} from "../api/communityServerService.ts";
import type {RefObject} from "react";
import PresenceStatusIcon from "./PresenceStatusIcon.tsx";
import type {PresenceStatus} from "../api/schema.ts";

export interface PresenceProps {
  status: PresenceStatus;
  className?: string;
}

interface UserAvatarProps extends RadixAvatar.AvatarProps {
  userId?: string;
  version?: number;
  alt?: string;
  ref?: RefObject<HTMLDivElement | null>;
  presence?: PresenceProps;
}

function User({
  ref,
  userId,
  version,
  alt,
  className,
  presence,
  ...props
}: UserAvatarProps) {
  return (
    <div className={`relative ${className}`} ref={ref} {...props}>
      {/* Inner wrapper strictly clips the avatar to its rounded shape */}
      <div className="size-full rounded-[inherit] overflow-hidden">
        <RadixAvatar.Root className="size-full">
          <RadixAvatar.Image
            className="size-full object-cover"
            src={userId && version ? userService.getAvatarUrl(userId, version) : undefined}
            alt={alt}
            draggable={false}
          />

          <RadixAvatar.Fallback className="flex size-full items-center justify-center bg-gray-100">
            <BsPerson className="size-5/6 fill-black" />
          </RadixAvatar.Fallback>
        </RadixAvatar.Root>
      </div>

      {presence && (
        <PresenceStatusIcon
          status={presence.status}
          className={`absolute bottom-0 right-0 translate-x-[20%] translate-y-[20%] rounded-full border-2 border-gray-750 bg-gray-750 ${presence.className ?? ""}`}
        />
      )}
    </div>
  );
}

interface ServerAvatarProps extends RadixAvatar.AvatarProps {
  serverId?: string;
  version?: number;
  alt?: string;
}

function Server({
  serverId,
  version,
  alt,
  ...props
}: ServerAvatarProps) {
  return (
    <RadixAvatar.Root {...props}>
      <RadixAvatar.Image
        className="size-full rounded-[inherit] object-cover"
        src={serverId && version ? communityServerService.getAvatarUrl(serverId, version) : undefined}
        alt={alt}
        draggable={false}
      />

      <RadixAvatar.Fallback className="flex size-full items-center justify-center bg-gray-100">
        <BsPeople className="size-5/6 fill-black" />
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}

export const Avatar = {
  User,
  Server,
}