import {BsClockFill, BsEmojiSmileFill, BsExclamationTriangle} from "react-icons/bs";
import {useInterval} from "usehooks-ts";
import {useState} from "react";
import {Separator} from "radix-ui";
import {Virtuoso} from "react-virtuoso";
import useUserEmojis from "../../hooks/useUserEmojis.ts";
import Spinner from "../Spinner.tsx";
import type {ServerEmojiGroupDto} from "../../api/types.ts";
import {Emoji} from "../Emoji.tsx";

interface ModeProps {
  onSelect: (mode: "e" | "t") => void;
  className?: string;
}

function SelectMode({ className = "", onSelect }: ModeProps) {
  return (
    <div className={`max-h-60 bg-gray-725 border-2 border-gray-600 rounded-lg overflow-y-scroll ${className}`}>
      <ul className="space-y-1 text-sm">
        <li 
          className="px-3 py-1.5 hover-highlight flex flex-row justify-center items-center gap-2 cursor-pointer"
          onClick={() => onSelect("e")}
        >
          <BsEmojiSmileFill className="flex-none size-8 fill-white"/>
          
          <div className="flex-1">
            <p>Emoji (e)</p>
            <p className="text-gray-400">Spice up the chat with some fun icons.</p>
          </div>
        </li>
  
        <li 
          className="px-3 py-1.5 hover-highlight flex flex-row justify-center items-center gap-2 cursor-pointer"
          onClick={() => onSelect("t")}
        >
          <BsClockFill className="flex-none size-8 fill-white"/>
  
          <div className="flex-1">
            <p>Time (t)</p>
            <p className="text-gray-400">What time is it?</p>
          </div>
        </li>
      </ul>
    </div>
  );
}

interface EmojiProps {
  onSelect: (emojiIds: string) => void;
  searchTerm: string;
  className?: string;
}

function EmojiMode({ className = "", searchTerm, onSelect }: EmojiProps) {
  const { data, isLoading, isError } = useUserEmojis();

  const filteredData = !data ?
    [] :
    !searchTerm || searchTerm.length === 0 ?
      data :
      data.map(group => ({
        ...group,
        emojiEntries: group.emojiEntries.filter(e => e.shortCode.includes(searchTerm.trim())),
      })).filter(group => group.emojiEntries.length > 0);

  return (
    <div
      className={`p-1 h-72 bg-gray-725 ring-2 ring-gray-600 rounded-lg overflow-hidden flex flex-col gap-2 transition-all duration-150 ${className}`}
    >
      {isLoading ? (
        <div className="size-full flex flex-row justify-center items-center">
          <Spinner className="size-8 fill-white"/>
        </div>
      ) : isError || !data ? (
        <div className="size-full flex flex-col gap-1 justify-center items-center">
          <BsExclamationTriangle className="size-8 fill-white"/>
          <p className="select-none text-center">Failed to load your emojis.</p>
        </div>
      ) : (
        <Virtuoso
          className="h-full"
          data={filteredData}
          computeItemKey={(index) => filteredData[index].serverInfo.serverId}
          itemContent={(_, emojiGroup: ServerEmojiGroupDto) => (
            <div className="mb-4 px-2">
              <div className="sticky top-0 bg-gray-725 backdrop-blur-sm py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {emojiGroup.serverInfo.name}
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,40px)] gap-1 justify-center mt-1">
                {emojiGroup.emojiEntries.map((emojiEntry) => (
                  <button
                    key={emojiEntry.id}
                    className="size-10 p-1 rounded-md hover-highlight cursor-pointer"
                    onClick={() => onSelect(emojiEntry.id)}
                  >
                    <Emoji.Root
                      emojiId={emojiEntry.id}
                      shortCode={emojiEntry.shortCode}
                      className="size-full block"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}

interface TimeProps {
  onSelectSystemTime?: () => void;
  className?: string;
}

function TimeMode({ className = "", onSelectSystemTime }: TimeProps) {
  const [systemTime, setSystemTime] = useState<number>(() => Date.now());
  useInterval(() => {
    setSystemTime(Date.now());
  }, 1000);
  
  return (
    <div className={`max-h-60 bg-gray-725 border-2 border-gray-600 rounded-lg overflow-y-scroll ${className}`}>
      <ul className="space-y-1 text-sm">
        <li className="px-3 py-1.5 flex flex-row items-center mt-1" onClick={onSelectSystemTime}>
          <p className="flex-1 text-left">Display current time</p>
          <p className="flex-1 text-right">:t:</p>
        </li>
  
        <li className="px-3 py-1.5 flex flex-row items-center" onClick={onSelectSystemTime}>
          <p className="flex-1 text-left">Specific point in time</p>
          <p className="flex-1 text-right">:t&lt;milisecond&gt;:</p>
        </li>
        
        <Separator.Root className="horizontal-separator mx-2"></Separator.Root>
        
        <li className="px-3 py-1.5 flex flex-row items-center hover-highlight cursor-pointer" onClick={onSelectSystemTime}>
          <p className="flex-1 text-left">System Time</p>
          <p className="flex-1 text-right">{systemTime}</p>
        </li>
      </ul>
    </div>
  );
}

export const Suggestion = {
  Mode: SelectMode,
  Emoji: EmojiMode,
  Time: TimeMode,
}