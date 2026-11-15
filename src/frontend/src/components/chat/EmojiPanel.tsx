import {BsEmojiWinkFill, BsExclamationTriangle, BsSearch} from "react-icons/bs";
import type {EmojiEntryDto} from "../../api/types.ts";
import {Virtuoso} from "react-virtuoso";
import {EmojiGroup} from "./EmojiGroup.tsx";
import useUserEmojis from "../../hooks/useUserEmojis.ts";
import {type UnicodeEmojiEntry, unicodeEmojiTable} from "../../emoji.ts";
import Spinner from "../Spinner.tsx";
import {type ReactNode, useRef, useState} from "react";
import {Popover as RadixPopover} from "radix-ui";

interface PopoverProps {
  trigger: ReactNode;
  side: "top" | "bottom" | "left" | "right";
  contentClassName?: string;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFocusOutside?: (e: CustomEvent) => void;
}

function Popover({
  trigger,
  side,
  contentClassName,
  children,
  open,
  onOpenChange,
  onFocusOutside,
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>
        {trigger}
      </RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          sideOffset={5}
          align="center"
          className={contentClassName}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onFocusOutside={onFocusOutside}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

export type SelectedEmoji =
  | (EmojiEntryDto & { type: "server-emoji" })
  | (UnicodeEmojiEntry & { type: "unicode-emoji" });

interface GroupsProps {
  onSelect: (value: SelectedEmoji) => void;
  searchTerm: string;
}

function Groups({
  searchTerm,
  onSelect,
}: GroupsProps) {
  const { data, isLoading, isError } = useUserEmojis();
  const trimmedSearchTerm = searchTerm.trim();

  const filteredData = !data ?
    [] :
    !trimmedSearchTerm || trimmedSearchTerm.length === 0 ?
      data :
      data.map(group => ({
        ...group,
        emojiEntries: group.emojiEntries.filter(e => e.shortCode.includes(trimmedSearchTerm)),
      })).filter(group => group.emojiEntries.length > 0);

  const filteredUnicodeEntries: UnicodeEmojiEntry[] = !trimmedSearchTerm || trimmedSearchTerm.length === 0 ?
    unicodeEmojiTable :
    unicodeEmojiTable.filter(e => e.name.includes(trimmedSearchTerm));

  return (
    <>
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
          className="h-full scrollbar-none"
          totalCount={filteredData.length + Math.sign(filteredUnicodeEntries.length)}  // +1 for built-in emoji table
          computeItemKey={(index) => index === filteredData.length ? "built-in" : filteredData[index].serverInfo.serverId}
          itemContent={(index: number) => {
            if (index < filteredData.length) {
              const emojiGroup = filteredData[index];

              return (
                <EmojiGroup.Server
                  groupName={emojiGroup.serverInfo.name}
                  emojiEntries={emojiGroup.emojiEntries}
                  onSelected={(entry) => onSelect({ type: "server-emoji", ...entry })}
                  className="px-2"
                />
              );
            } else {
              return (
                <EmojiGroup.Unicode
                  entries={filteredUnicodeEntries}
                  onSelected={(value) => onSelect({ type: "unicode-emoji", ...value }) }
                  className="px-2"
                />
              );
            }
          }}
          components={{
            EmptyPlaceholder: () => (
              <div className="size-full flex flex-row justify-center items-center">
                Nothing is here...
              </div>
            ),
          }}
        />
      )}
    </>
  );
}

interface StandardPopoverProps {
  trigger: ReactNode;
  side: "top" | "bottom" | "left" | "right";
  contentClassName?: string;
  onSelect: (value: SelectedEmoji) => void;
  onOpenChange?: (open: boolean) => void;
}

function StandardPopover({
  trigger,
  contentClassName,
  onSelect,
  side,
  onOpenChange,
}: StandardPopoverProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const shiftPressedRef = useRef(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <EmojiPanel.Popover
      trigger={trigger}
      side={side}
      contentClassName={contentClassName}
      open={isOpen}
      onOpenChange={handleOpenChange}
      onFocusOutside={(e) => {
        if (shiftPressedRef.current) {
          e.preventDefault();
        }
      }}
    >
      <div
        className="size-full flex flex-col"
        onClickCapture={(e) => {
          shiftPressedRef.current = e.shiftKey;
        }}
      >
        <header className="flex-none p-2 border-b-2 border-b-gray-600">
          <div className="flex-1 relative w-full">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />

            <input
              type="text"
              placeholder="Search for emoji..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 input-field pl-9 w-full"
            />
          </div>
        </header>

        <section className="flex-1 min-h-0">
          <Groups
            searchTerm={searchTerm}
            onSelect={(emoji: SelectedEmoji) => {
              onSelect(emoji);

              if (!shiftPressedRef.current) {
                handleOpenChange(false);
              }
            }}
          />
        </section>
      </div>
    </EmojiPanel.Popover>
  );
}

export const EmojiPanel = {
  Popover,
  Groups,
  StandardPopover,
}