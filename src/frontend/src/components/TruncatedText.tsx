import { useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface TruncatedTextProps {
  children: string;
  className?: string;
  delayDuration?: number;
}

export function TruncatedText({
  children,
  className = "",
  delayDuration = 300,
}: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const handleMouseEnter = () => {
    const el = textRef.current;
    if (el) {
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      setIsTruncated(hasOverflow);
    }
  };

  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root open={isTruncated ? undefined : false}>
        <Tooltip.Trigger asChild>
          <span
            ref={textRef}
            onMouseEnter={handleMouseEnter}
            className={`block truncate ${className}`}
          >
            {children}
          </span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={4}
            className="z-50 max-w-xs rounded-md bg-gray-550 px-2.5 py-1.5 text-xs text-white shadow-lg animate-in fade-in-0 zoom-in-95 wrap-break-word"
          >
            {children}
            <Tooltip.Arrow className="fill-gray-550" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}