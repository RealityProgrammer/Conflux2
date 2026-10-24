import {BsClockFill, BsEmojiSmileFill} from "react-icons/bs";
import {useInterval} from "usehooks-ts";
import {type RefObject, useEffect, useRef, useState} from "react";
import {Separator} from "radix-ui";
import {type GridComponents, VirtuosoGrid} from "react-virtuoso";
import {emojiTable} from "../../emoji.ts";
import {useDebounceValue} from "usehooks-ts";

interface ModeProps {
  onSelect: (mode: "e" | "t") => void;
  className?: string;
}

function Mode({ className = "", onSelect }: ModeProps) {
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
  onSelect: (emoji: string) => void;
  searchTerm: string;
  className?: string;
}

function Emoji({ className = "", searchTerm, onSelect }: EmojiProps) {
  const filteredEmojiTable = searchTerm && searchTerm.length > 0 ? emojiTable.filter(e => e.name.includes(searchTerm)) : emojiTable;
  
  // really hacky way to do responsiveness while keeping height correct
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemsPerRow, setItemsPerRow] = useState(3);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setItemsPerRow(width < 320 ? 1 : width < 640 ? 2 : width < 1024 ? 3 : 4);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const emojiGridComponents: GridComponents = {
    List: ({className = "", children, ...props}) => (
      <div ref={props.ref} {...props} className={`flex flex-wrap ${className}`}>
        {children}
      </div>
    ),
    Item: ({ children, ...props }) => (
      <div 
        className="flex-none flex content-stretch" 
        style={{ width: `${(1 / itemsPerRow) * 100}%`, padding: "0.125rem", }}
        {...props} 
      >
        {children}
      </div>
    ),
  };

  const totalCount = filteredEmojiTable.length;
  const rowHeight = 52;         // Approximate height of an item row in pixels
  const containerPadding = 16;  // Top/bottom padding buffer
  const maxContainerHeight = 288; // h-72 equals 288px

  const calculatedHeight = Math.min(
    Math.ceil(totalCount / itemsPerRow) * rowHeight + containerPadding,
    maxContainerHeight
  );
  
  return (
    <div
      ref={containerRef}
      className={`p-1 bg-gray-725 border-2 border-gray-600 rounded-lg overflow-hidden flex flex-col gap-2 transition-all duration-150 ${className}`}
      style={{ height: `${calculatedHeight}px` }}
    >
      <VirtuosoGrid
        className="overflow-x-hidden scrollbar-none"
        totalCount={filteredEmojiTable.length}
        components={emojiGridComponents}
        itemContent={(index) => {
          const entry = filteredEmojiTable[index];

          return (
            <div 
              className="select-none cursor-pointer hover-highlight flex-1 flex flex-row items-center gap-2 p-2 border-2 border-gray-600 rounded-md"
              onClick={() => {
                onSelect(entry.value);
              }}
            >
              <p className="flex-none">{entry.value}</p>
              <span className="flex-1 text-sm truncate min-w-0">{entry.name}</span>
            </div>
          );
        }}
      />
    </div>
  );
}

interface TimeProps {
  onSelectSystemTime?: () => void;
  className?: string;
}

function Time({ className = "", onSelectSystemTime }: TimeProps) {
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
  Mode,
  Emoji,
  Time,
}