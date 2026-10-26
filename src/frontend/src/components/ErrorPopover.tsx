import {Popover} from "radix-ui";
import type {ReactNode} from "react";

export interface ErrorPopoverProps {
  open: boolean;
  children: ReactNode;
  content?: string;
  sideOffset?: number;
}

export default function ErrorPopover({
  open,
  children,
  content,
  sideOffset = 5,
}: ErrorPopoverProps) {
  return (
    <Popover.Root open={open}>
      <Popover.Anchor asChild>
        {children}
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={sideOffset}
          align="center"
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg animate-in fade-in zoom-in duration-200"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {content}

          <Popover.Arrow className="fill-red-600" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}