import {Emoji} from "../Emoji.tsx";
import {type HTMLAttributes, useId} from "react";
import usePositionBasedRandom from "../../hooks/usePositionBasedRandom.ts";

interface EmojiGroupProps extends HTMLAttributes<HTMLDivElement> {
  groupName: string;
  emojiEntries: { id: string; shortCode: string; }[];
  onSelected: (value: {id: string; shortCode: string}) => void;
}

function Root({groupName, emojiEntries, onSelected, ...props}: EmojiGroupProps) {
  return (
    <div {...props}>
      <div className="sticky top-0 bg-gray-725 backdrop-blur-sm py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {groupName}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,40px)] gap-1 justify-center mt-1">
        {emojiEntries.map((entry) => (
          <button
            key={entry.id}
            className="size-10 p-1 rounded-md hover-highlight cursor-pointer"
            onClick={() => onSelected(entry)}
          >
            <Emoji.Root
              emojiId={entry.id}
              shortCode={entry.shortCode}
              className="size-full block"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function Skeleton({...props}: HTMLAttributes<HTMLDivElement>) {
  // const countId = useId();
  // const emojiSkeletonCount = Math.abs(hash(countId)) % 45 + 5;

  const emojiSkeletonCount = Math.ceil(usePositionBasedRandom() * 17) + 8;

  return (
    <div {...props}>
      <div className="w-1/2 h-4 rounded-full bg-white/10 animate-pulse"></div>

      <div className="grid grid-cols-[repeat(auto-fill,40px)] gap-1 justify-center mt-1">
        {Array.from({ length: emojiSkeletonCount }, (_, i) => (
          <div
            key={i}
            className="size-10 bg-white/10 animate-pulse rounded-md"
          ></div>
        ))}
      </div>
    </div>
  )
}

export const EmojiGroup = {
  Root,
  Skeleton,
}