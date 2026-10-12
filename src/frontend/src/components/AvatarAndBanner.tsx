import type {CSSProperties, ReactNode} from "react";
import {Avatar as RadixAvatar} from "radix-ui";
import {Avatar} from "./Avatar.tsx";
import {userService} from "../api/userService.ts";

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
      <RadixAvatar.Root className={`size-full aspect-video overflow-hidden ${banner.rootClassName ?? ""}`}>
        <RadixAvatar.Image
          className="size-full object-contain"
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
}: UserProps) {
  return (
    <div className="relative w-full aspect-video mb-11">
      <RadixAvatar.Root className={`size-full aspect-video overflow-hidden ${bannerClassName}`}>
        <RadixAvatar.Image
          className="size-full object-contain"
          src={bannerVersion ? userService.getBannerUrl(userId, bannerVersion) : undefined}
          alt={bannerAlt}
        />

        <RadixAvatar.Fallback 
          className="size-full"
          style={{
            backgroundColor: bannerFallbackColor,
          }}
        >
        </RadixAvatar.Fallback>
      </RadixAvatar.Root>
      
      <Avatar.User
        userId={userId}
        version={avatarVersion}
        alt={avatarAlt}
        className={`absolute left-2 -bottom-11 size-21 overflow-hidden rounded-full ${avatarClassName}`}
      />
    </div>
  );
}

interface SkeletonProps {
  avatarClassName?: string;
}

export function Skeleton({
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
  Skeleton,
}