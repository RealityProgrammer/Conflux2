import { useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface TruncatedTextProps {
  children: string;
  className?: string;
  delayDuration?: number;
}

export function TruncatedText({ children, className = "" }: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = () => {
    const element = textRef.current;
    if (element) {
      const hasOverflow = element.scrollWidth > element.clientWidth + 1;
      setIsTruncated(hasOverflow);
    }
  };

  return (
    <Tooltip.Root
      open={isTruncated ? isOpen : false}
      onOpenChange={(open) => {
        if (open) checkTruncation();
        setIsOpen(open);
      }}
    >
      <Tooltip.Trigger asChild>
        <span ref={textRef} onMouseEnter={checkTruncation} className={`block truncate ${className}`}>
          {children}
        </span>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          align="center"
          sideOffset={4}
          className="bg-gray-550 animate-in fade-in-0 zoom-in-95 z-50 max-w-xs rounded-md px-2.5 py-1.5 text-sm wrap-break-word text-white shadow-lg"
        >
          {children}
          <Tooltip.Arrow className="fill-gray-550" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
