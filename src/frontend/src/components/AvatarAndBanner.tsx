import type {CSSProperties, ReactNode} from "react";
import {Avatar as RadixAvatar} from "radix-ui";
import {Avatar, type PresenceProps} from "./Avatar.tsx";
import {userService} from "../api/userService.ts";
import {communityServerService} from "../api/communityServerService.ts";
import {BsExclamationTriangle} from "react-icons/bs";

export type ImageProfile = {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
  rootClassName?: string;
}

interface TemplateProps {
  avatar: ImageProfile;
  banner: ImageProfile;
}

export function Template({
  avatar,
  banner,
}: TemplateProps) {
  return (
    <div className="relative w-full aspect-video mb-11">
      <RadixAvatar.Root className={`block aspect-video overflow-hidden ${banner.rootClassName ?? ""}`}>
        <RadixAvatar.Image
          className="size-full object-cover"
          src={banner.src}
          alt={banner.alt}
        />

        {banner.fallback}
      </RadixAvatar.Root>
      
      <RadixAvatar.Root className={`absolute left-2 -bottom-11 size-21 overflow-hidden rounded-full ${avatar.rootClassName ?? ""}`}>
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
  bannerVersion?: number;
  bannerAlt?: string;
  bannerFallbackColor?: CSSProperties["backgroundColor"];
  avatarClassName?: string;
  avatarVersion?: number;
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
    <div className="relative w-full aspect-video mb-11">
      <RadixAvatar.Root className={`block aspect-video overflow-hidden ${bannerClassName}`}>
        <RadixAvatar.Image
          className="size-full object-cover"
          src={bannerVersion ? userService.getBannerUrl(userId, bannerVersion) : undefined}
          alt={bannerAlt}
        />

        <RadixAvatar.Fallback 
          className="block size-full"
          style={{
            backgroundColor: bannerFallbackColor,
          }}
        >
        </RadixAvatar.Fallback>
      </RadixAvatar.Root>
      
      <div className="absolute left-2 -bottom-11">
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
    <div className="relative w-full aspect-video mb-11">
      <RadixAvatar.Root className={`block aspect-video overflow-hidden ${bannerClassName}`}>
        <RadixAvatar.Image
          className="size-full object-cover"
          src={bannerVersion ? communityServerService.getBannerUrl(serverId, bannerVersion) : undefined}
          alt={bannerAlt}
        />

        <RadixAvatar.Fallback
          className="block size-full"
          style={{
            backgroundColor: bannerFallbackColor,
          }}
        >
        </RadixAvatar.Fallback>
      </RadixAvatar.Root>

      <div className="absolute left-2 -bottom-11">
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
      banner={{fallback: (
          <div
            className="bg-red-300 size-full flex flex-row justify-center items-center"
          >
            <BsExclamationTriangle className="size-8 fill-red-500 animate-pulse"/>
          </div>
        )}}
      avatar={{fallback: (
          <div className="bg-red-300 border-4 border-gray-725 size-full overflow-hidden rounded-full flex flex-col gap-1 justify-center items-center">
            <BsExclamationTriangle className="size-12 fill-red-500 animate-pulse"/>
          </div>
        )}}
    />
  )
}

interface SkeletonProps {
  avatarClassName?: string;
}

function Skeleton({
  avatarClassName = "",
}: SkeletonProps) {
  return (
    <div className="relative w-full aspect-video mb-11">
      <div className="size-full aspect-video overflow-hidden animate-pulse bg-white/10"></div>

      <div className={`absolute left-2 -bottom-11 size-21 animate-pulse bg-white/10 ${avatarClassName}`}></div>
    </div>
  );
}

export const AvatarAndBanner = {
  Template,
  User,
  Server,
  Error,
  Skeleton,
}