import type { CSSProperties, ReactNode } from "react";
import { Avatar as RadixAvatar } from "radix-ui";
import { Avatar, type PresenceProps } from "./Avatar.tsx";
import { userService } from "../api/userService.ts";
import { serverService } from "../api/serverService.ts";
import { BsExclamationTriangle } from "react-icons/bs";

export type ImageProfile = {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
  rootClassName?: string;
};

interface TemplateProps {
  avatar: ImageProfile;
  banner: ImageProfile;
}

export function Template({ avatar, banner }: TemplateProps) {
  return (
    <div className="relative mb-11 aspect-video w-full">
      <RadixAvatar.Root
        className={`block aspect-video overflow-hidden ${banner.rootClassName ?? ""}`}
      >
        <RadixAvatar.Image
          className="size-full object-cover"
          src={banner.src}
          alt={banner.alt}
        />

        {banner.fallback}
      </RadixAvatar.Root>

      <RadixAvatar.Root
        className={`absolute -bottom-11 left-2 size-21 overflow-hidden rounded-full ${avatar.rootClassName ?? ""}`}
      >
        <RadixAvatar.Image
          className="size-full object-contain"
          src={avatar.src}
          alt={avatar.alt}
        />

        {avatar.fallback}
      </RadixAvatar.Root>
    </div>
  );
}

interface UserProps {
  userId: string;
  bannerClassName?: string;
  bannerVersion: number | null | undefined;
  bannerAlt?: string;
  bannerFallbackColor?: CSSProperties["backgroundColor"];
  avatarClassName?: string;
  avatarVersion: number | null | undefined;
  avatarAlt?: string;
  presence?: PresenceProps;
}

function User({
  userId,
  bannerClassName = "",
  bannerVersion,
  bannerAlt,
  bannerFallbackColor = "var(--color-violet-500)",
  avatarClassName = "",
  avatarVersion,
  avatarAlt,
  presence,
}: UserProps) {
  return (
    <div className="relative mb-11 aspect-video w-full">
      <RadixAvatar.Root
        className={`block aspect-video overflow-hidden ${bannerClassName}`}
      >
        <RadixAvatar.Image
          className="size-full object-cover"
          src={
            bannerVersion
              ? userService.getBannerUrl(userId, bannerVersion)
              : undefined
          }
          alt={bannerAlt}
        />

        <RadixAvatar.Fallback
          className="block size-full"
          style={{
            backgroundColor: bannerFallbackColor,
          }}
        ></RadixAvatar.Fallback>
      </RadixAvatar.Root>

      <div className="absolute -bottom-11 left-2">
        <Avatar.User
          userId={userId}
          version={avatarVersion}
          alt={avatarAlt}
          className={`size-21 rounded-full ${avatarClassName}`}
          presence={presence}
        />
      </div>
    </div>
  );
}

interface ServerProps {
  serverId: string;
  bannerClassName?: string;
  bannerVersion?: number;
  bannerAlt?: string;
  bannerFallbackColor?: CSSProperties["backgroundColor"];
  avatarClassName?: string;
  avatarVersion?: number;
  avatarAlt?: string;
}

function Server({
  serverId,
  bannerClassName = "",
  bannerVersion,
  bannerAlt,
  bannerFallbackColor = "var(--color-amber-500)",
  avatarClassName = "",
  avatarVersion,
  avatarAlt,
}: ServerProps) {
  return (
    <div className="relative mb-11 aspect-video w-full">
      <RadixAvatar.Root
        className={`block aspect-video overflow-hidden ${bannerClassName}`}
      >
        <RadixAvatar.Image
          className="size-full object-cover"
          src={
            bannerVersion
              ? serverService.getBannerUrl(serverId, bannerVersion)
              : undefined
          }
          alt={bannerAlt}
        />

        <RadixAvatar.Fallback
          className="block size-full"
          style={{
            backgroundColor: bannerFallbackColor,
          }}
        ></RadixAvatar.Fallback>
      </RadixAvatar.Root>

      <div className="absolute -bottom-11 left-2">
        <Avatar.Server
          serverId={serverId}
          version={avatarVersion}
          alt={avatarAlt}
          className={`size-21 rounded-full ${avatarClassName}`}
        />
      </div>
    </div>
  );
}

function Error() {
  return (
    <AvatarAndBanner.Template
      banner={{
        fallback: (
          <div className="flex size-full flex-row items-center justify-center bg-red-300">
            <BsExclamationTriangle className="size-8 animate-pulse fill-red-500" />
          </div>
        ),
      }}
      avatar={{
        fallback: (
          <div className="border-gray-725 flex size-full flex-col items-center justify-center gap-1 overflow-hidden rounded-full border-4 bg-red-300">
            <BsExclamationTriangle className="size-12 animate-pulse fill-red-500" />
          </div>
        ),
      }}
    />
  );
}

interface SkeletonProps {
  avatarClassName?: string;
}

function Skeleton({ avatarClassName = "" }: SkeletonProps) {
  return (
    <div className="relative mb-11 aspect-video w-full">
      <div className="aspect-video size-full animate-pulse overflow-hidden bg-white/10"></div>

      <div
        className={`absolute -bottom-11 left-2 size-21 animate-pulse bg-white/10 ${avatarClassName}`}
      ></div>
    </div>
  );
}

export const AvatarAndBanner = {
  Template,
  User,
  Server,
  Error,
  Skeleton,
};
