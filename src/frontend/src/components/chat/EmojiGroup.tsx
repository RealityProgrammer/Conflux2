import {Emoji} from "../Emoji.tsx";
import {type HTMLAttributes} from "react";
import usePositionBasedRandom from "../../hooks/usePositionBasedRandom.ts";
import {type UnicodeEmojiEntry, unicodeEmojiTable} from "../../emoji.ts";

interface EmojiGroupProps extends HTMLAttributes<HTMLDivElement> {
  groupName: string;
  emojiEntries: { id: string; shortCode: string; }[];
  onSelected: (value: {id: string; shortCode: string; }) => void;
}

function Server({groupName, emojiEntries, onSelected, ...props}: EmojiGroupProps) {
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
  );
}

interface UnicodeProps extends HTMLAttributes<HTMLDivElement> {
  entries?: UnicodeEmojiEntry[];
  onSelected: (value: {name: string; value: string; }) => void;
}

function Unicode({entries, onSelected, ...props}: UnicodeProps) {
  return (
    <div {...props}>
      <div className="sticky top-0 bg-gray-725 backdrop-blur-sm py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Unicode
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,40px)] gap-1 justify-center mt-1">
        {(entries ? entries : unicodeEmojiTable).map((entry) => (
          <button
            key={entry.value}
            className="size-10 p-1 rounded-md hover-highlight cursor-pointer"
            onClick={() => onSelected(entry)}
          >
            <p className="text-xl">{entry.value}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Skeleton({...props}: HTMLAttributes<HTMLDivElement>) {
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
  );
}

export const EmojiGroup = {
  Server,
  Unicode,
  Skeleton,
}