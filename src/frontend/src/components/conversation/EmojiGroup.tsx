import { Emoji } from "../Emoji.tsx";
import { type HTMLAttributes } from "react";
import usePositionBasedRandom from "../../hooks/usePositionBasedRandom.ts";
import { type UnicodeEmojiEntry, unicodeEmojiTable } from "../../emoji.ts";

interface EmojiGroupProps extends HTMLAttributes<HTMLDivElement> {
  groupName: string;
  emojiEntries: { id: string; shortCode: string }[];
  onSelected: (value: { id: string; shortCode: string }) => void;
}

function Server({
  groupName,
  emojiEntries,
  onSelected,
  ...props
}: EmojiGroupProps) {
  return (
    <div {...props}>
      <div className="bg-gray-725 sticky top-0 py-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase backdrop-blur-sm">
        {groupName}
      </div>

      <div className="mt-1 grid grid-cols-[repeat(auto-fill,40px)] justify-center gap-1">
        {emojiEntries.map((entry) => (
          <button
            key={entry.id}
            className="hover-highlight size-10 cursor-pointer rounded-md p-1"
            onClick={() => onSelected(entry)}
          >
            <Emoji.Root
              emojiId={entry.id}
              shortCode={entry.shortCode}
              className="block size-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface UnicodeProps extends HTMLAttributes<HTMLDivElement> {
  entries?: UnicodeEmojiEntry[];
  onSelected: (value: { name: string; value: string }) => void;
}

function Unicode({ entries, onSelected, ...props }: UnicodeProps) {
  return (
    <div {...props}>
      <div className="bg-gray-725 sticky top-0 py-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase backdrop-blur-sm">
        Unicode
      </div>

      <div className="mt-1 grid grid-cols-[repeat(auto-fill,40px)] justify-center gap-1">
        {(entries ? entries : unicodeEmojiTable).map((entry) => (
          <button
            key={entry.value}
            className="hover-highlight size-10 cursor-pointer rounded-md p-1"
            onClick={() => onSelected(entry)}
          >
            <p className="text-xl">{entry.value}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Skeleton({ ...props }: HTMLAttributes<HTMLDivElement>) {
  const emojiSkeletonCount = Math.ceil(usePositionBasedRandom() * 17) + 8;

  return (
    <div {...props}>
      <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/10"></div>

      <div className="mt-1 grid grid-cols-[repeat(auto-fill,40px)] justify-center gap-1">
        {Array.from({ length: emojiSkeletonCount }, (_, i) => (
          <div
            key={i}
            className="size-10 animate-pulse rounded-md bg-white/10"
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
};
