import {BsClockFill, BsEmojiSmileFill} from "react-icons/bs";
import {useInterval} from "usehooks-ts";
import {useState} from "react";
import {Separator} from "radix-ui";
import {VirtuosoGrid} from "react-virtuoso";

interface ModeProps {
  onSelect: (mode: "e" | "t") => void;
}

function Mode({ onSelect }: ModeProps) {
  return (
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
  );
}

interface EmojiProps {
  onSelect: () => void;
}

const emojiGridComponents = {
  
}

function Emoji({ onSelect }: ModeProps) {
  return (
    <VirtuosoGrid
      totalCount={5000}
      components={emojiGridComponents}
    >
      
    </VirtuosoGrid>
    // <ul className="space-y-1 text-sm">
    //   {Array.from({ length: 20 }, (_, i) => (
    //     <li key={i} className="px-3 py-1.5 hover-highlight flex flex-row justify-center items-center gap-2 cursor-pointer">
    //       <div className="flex-none size-5 bg-red-500"></div>
    //       <p className="flex-1">le_name</p>
    //     </li>
    //   ))}
    // </ul>
  );
}

interface TimeProps {
  onSelectSystemTime?: () => void;
}

function Time({ onSelectSystemTime }: TimeProps) {
  const [systemTime, setSystemTime] = useState<number>(() => Date.now());
  useInterval(() => {
    setSystemTime(Date.now());
  }, 1000);
  
  return (
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
  );
}

export const SuggestionContent = {
  Mode,
  Emoji,
  Time,
}