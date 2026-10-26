import {emojiService} from "../api/emojiService.ts";
import type {HTMLAttributes} from "react";

interface EmojiProps extends HTMLAttributes<HTMLDivElement> {
  emojiId: string;
  shortCode: string;
}

function Root({ emojiId, shortCode, className, ...props }: EmojiProps) {
  return (
    <div className={`${className}`} {...props}>
      <img
        src={emojiService.getImageUrl(emojiId)}
        alt={shortCode}
        className="size-full object-contain"
      />
    </div>
  )
}

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-white/10 animate-pulse ${className}`} {...props}></div>
  )
}

export const Emoji = {
  Root,
  Skeleton,
}