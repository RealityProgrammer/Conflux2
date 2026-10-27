import {emojiService} from "../api/emojiService.ts";
import {useState, type HTMLAttributes} from "react";
import {BsExclamationTriangle} from "react-icons/bs"

interface EmojiProps extends HTMLAttributes<HTMLDivElement> {
  emojiId: string;
  shortCode?: string;
}

function Root({ emojiId, shortCode, className, ...props }: EmojiProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <BsExclamationTriangle className={`inline-block fill-red-500 animate-pulse ${className}`}/>
    );
  }

  return (
    <span className={`${className}`} {...props}>
      <img
        loading="lazy"
        src={emojiService.getImageUrl(emojiId)}
        alt={shortCode ?? `emoji-${emojiId}`}
        className="size-full object-contain"
        onError={() => setHasError(true)}
      />
    </span>
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