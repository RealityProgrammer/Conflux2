import {Avatar} from "radix-ui";
import type {PresenceStatus} from "../graphql/types.ts";
import {BsPerson} from "react-icons/bs";
import UserAvatar from "./UserAvatar.tsx";
import PresenceStatusIcon from "./PresenceStatusIcon.tsx";
import {hash} from "../utils/hashing.ts";
import type {CSSProperties} from "react";

interface AvatarAndBannerProps {
  avatarSrc?: string;
  avatarAlt?: string;
  bannerSrc?: string;
  bannerAlt?: string;
  bannerFallbackColor?: CSSProperties["backgroundColor"]
  avatarClassName?: string;
  presenceStatus?: PresenceStatus;
  presenceStatusClassName?: string;
}

export default function UserAvatarAndBanner({
  avatarSrc,
  avatarAlt,
  bannerSrc,
  bannerAlt,
  bannerFallbackColor,
  avatarClassName = "",
  presenceStatus,
  presenceStatusClassName,
}: AvatarAndBannerProps) {
  return (
    <div className="relative w-full aspect-video mb-11">
      <Avatar.Root className="block w-full aspect-video overflow-hidden">
        <Avatar.Image className="size-full object-cover" src={bannerSrc} alt={bannerAlt}/>

        <Avatar.Fallback
          className="flex size-full"
          style={{
            backgroundColor: bannerFallbackColor ?? "var(--color-indigo-500)",
          }}
        />
      </Avatar.Root>

      <div className="absolute left-2 -bottom-11 size-21 rounded-full">
        <div className="relative">
          <UserAvatar
            className={`border-4 ${avatarClassName}`}
            src={avatarSrc}
            alt={avatarAlt}
          />

          {presenceStatus && (
            <PresenceStatusIcon
              status={presenceStatus}
              className={`absolute bottom-0 right-0 rounded-full ${presenceStatusClassName}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}