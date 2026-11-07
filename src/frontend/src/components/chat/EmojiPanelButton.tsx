import {Popover} from "radix-ui";
import IconButton from "../IconButton.tsx";
import {BsEmojiWinkFill, BsExclamationTriangle} from "react-icons/bs";
import {useDebounceValue} from "usehooks-ts";
import type {ServerEmojiGroupDto} from "../../api/types.ts";
import {Virtuoso} from "react-virtuoso";
import {EmojiGroup} from "./EmojiGroup.tsx";
import useUserEmojis from "../../hooks/useUserEmojis.ts";

interface EmojiPanelButtonProps {
  onSelect: (value: {id: string; shortCode: string}) => void;
}

export default function EmojiPanelButton({onSelect}: EmojiPanelButtonProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          className="flex-none mb-2"
          isLoading={false}
        >
          <BsEmojiWinkFill className="size-6"/>
        </IconButton>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={5}
          align="end"
          className="w-96 h-128 border-2 border-gray-600 rounded-lg bg-gray-725 text-white shadow-lg flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <PopoverContent onSelect={onSelect}/>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PopoverContent({onSelect}: {onSelect: (value: {id: string; shortCode: string}) => void;}) {
  const { data, isLoading, isError } = useUserEmojis();
  const [searchTerm, setSearchTerm] = useDebounceValue("", 500);

  const filteredGroups = !data || isLoading || isError || searchTerm.trim() !== '' ?
    [] :
    data.map(g => ({
      ...g,
      emojiEntries: g.emojiEntries.filter(e => e.shortCode.includes(searchTerm))
    })).filter(g => g.emojiEntries.length > 0);

  return (
    <>
      <header className="border-b-2 border-b-gray-600 p-3">
        <h2 className="font-bold text-xl text-gray-300">Emoji List</h2>

        <div className="flex flex-row justify-center items-center gap-2 mt-3">
          <input
            type="text"
            placeholder="Enter name..."
            className="flex-1 input-field h-9 text-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <section className="px-2 py-2 overflow-y-hidden space-y-3">
          <EmojiGroup.Skeleton/>
          <EmojiGroup.Skeleton/>
          <EmojiGroup.Skeleton/>
        </section>
      ) : isError || !data ? (
        <div className="size-full flex flex-col gap-1 justify-center items-center">
          <BsExclamationTriangle className="size-8 fill-white"/>
          <p>Failed to load emojis.</p>
        </div>
      ) : (
        <Virtuoso
          className="size-full"
          data={filteredGroups}
          computeItemKey={(index) => filteredGroups[index].serverInfo.serverId}
          itemContent={(_, group: ServerEmojiGroupDto) => (
            <EmojiGroup.Server
              groupName={group.serverInfo.name}
              emojiEntries={group.emojiEntries}
              onSelected={onSelect}
              className="px-2"
            />
          )}
        />
      )}
    </>
  )
}