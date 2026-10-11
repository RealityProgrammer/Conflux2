import type {ReactNode} from "react";
import {Avatar} from "radix-ui";

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
      <Avatar.Root className={`size-full aspect-video overflow-hidden ${banner.rootClassName ?? ""}`}>
        <Avatar.Image
          className="size-full object-contain"
          src={banner.src}
          alt={banner.alt}
        />

        {banner.fallback}
      </Avatar.Root>
      
      <Avatar.Root className={`absolute left-2 -bottom-11 size-21 overflow-hidden rounded-full ${avatar.rootClassName ?? ""}`}>
        <Avatar.Image
          className="size-full object-contain"
          src={avatar.src}
          alt={avatar.alt}
        />

        {avatar.fallback}
      </Avatar.Root>
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
  Skeleton,
}