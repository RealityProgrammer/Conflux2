import {BsAt, BsClockFill, BsEmojiSmileFill, BsEmojiTear, BsExclamationTriangle} from "react-icons/bs";
import {useInterval} from "usehooks-ts";
import {useState} from "react";
import {Separator} from "radix-ui";
import {Virtuoso} from "react-virtuoso";
import useUserEmojis from "../../hooks/useUserEmojis.ts";
import Spinner from "../Spinner.tsx";
import type {EmojiEntryDto, UserIdentityProfileDto} from "../../api/types.ts";
import {EmojiGroup} from "./EmojiGroup.tsx";
import {useInfiniteGetMentionableUsersQuery} from "../../graphql/infiniteQueries.ts";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import {UserNameplate} from "../UserNameplate.tsx";
import {useUserIdentityStore} from "../../store/useUserIdentityStore.ts";
import {type UnicodeEmojiEntry, unicodeEmojiTable} from "../../emoji.ts";

interface ModeProps {
  onSelect: (mode: "e" | "t" | "m") => void;
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

        <li
          className="px-3 py-1.5 hover-highlight flex flex-row justify-center items-center gap-2 cursor-pointer"
          onClick={() => onSelect("m")}
        >
          <BsAt className="flex-none size-8 fill-white"/>

          <div className="flex-1">
            <p>Mention (m)</p>
            <p className="text-gray-400">Specifically mention an user to draw their attention.</p>
          </div>
        </li>
      </ul>
    </div>
  );
}

export type SelectedEmoji =
  | (EmojiEntryDto & { type: "server-emoji" })
  | (UnicodeEmojiEntry & { type: "unicode-emoji" });

interface EmojiProps {
  onSelect: (value: SelectedEmoji) => void;
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

  const filteredUnicodeEntries: UnicodeEmojiEntry[] = !searchTerm || searchTerm.length === 0 ?
    unicodeEmojiTable :
    unicodeEmojiTable.filter(e => e.name.includes(searchTerm.trim()));

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
          totalCount={filteredData.length + 1}  // +1 for built-in emoji table
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
        />
      )}
    </div>
  );
}

interface TimeProps {
  onSelect: (value: Date) => void;
  className?: string;
}

function TimeMode({ className = "", onSelect }: TimeProps) {
  const [systemTime, setSystemTime] = useState<number>(() => Date.now());
  useInterval(() => {
    setSystemTime(Date.now());
  }, 1000);
  
  return (
    <div className={`max-h-60 bg-gray-725 border-2 border-gray-600 rounded-lg overflow-y-scroll scrollbar-none ${className}`}>
      <ul className="space-y-1 text-sm">
        <li className="px-3 py-1.5 flex flex-row items-center mt-1">
          <p className="flex-1 text-left">Display current time</p>
          <p className="flex-1 text-right">:t:</p>
        </li>
  
        <li className="px-3 py-1.5 flex flex-row items-center">
          <p className="flex-1 text-left">Specific point in time</p>
          <p className="flex-1 text-right">:t&lt;millisecond&gt;:</p>
        </li>
        
        <Separator.Root className="horizontal-separator mx-2"></Separator.Root>
        
        <li className="px-3 py-1.5 flex flex-row items-center hover-highlight cursor-pointer" onClick={() => onSelect(new Date())}>
          <p className="flex-1 text-left">System Time</p>
          <p className="flex-1 text-right">{systemTime}</p>
        </li>
      </ul>
    </div>
  );
}

interface MentionProps {
  className?: string;
  searchTerm: string;
  onSelect?: (userIdentity: UserIdentityProfileDto) => void;
}

function MentionMode({className, searchTerm = "", onSelect}: MentionProps) {
  const { conversationId } = useChatContainerContext();
  const setUsers = useUserIdentityStore((state) => state.setUsers);

  const { data, isLoading, isError, isEnabled } = useInfiniteGetMentionableUsersQuery(
    { conversationId, nameFilter: searchTerm },
    {
      enabled: searchTerm.length >= 3,
      initialPageParam: { after: null },
      getNextPageParam: (lastPage) => {
        const pageInfo = lastPage?.mentionableUsers?.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
    }
  );

  const allElements = data?.pages.flatMap((page) => page?.mentionableUsers.nodes ?? []) ?? [];
  const [listHeight, setListHeight] = useState(150);

  const commonClassName = `bg-gray-725 ring-2 ring-gray-600 rounded-lg flex flex-col justify-center items-center gap-1 text-sm ${className}`;

  return (
    <>
      {!isEnabled ? (
        <div className={`text-center py-3 ${commonClassName}`}>
          To search user, type at least 3 characters in their name.
        </div>
      ) : isLoading ? (
        <div className={`max-h-80 text-center p-1 ${commonClassName}`}>
          <>
            {Array.from({length: 6}, (_, i) => (
              <UserNameplate.Skeleton key={i} className="p-1"/>
            ))}
          </>
        </div>
      ) : isError || !data ? (
        <div className={`py-3 ${commonClassName}`}>
          <BsExclamationTriangle className="size-8 fill-white"/>
          <p className="text-center select-none">Failed to load mentionable users.</p>
        </div>
      ) : (
        <div className={`p-1 ${commonClassName}`}>
          <Virtuoso
            className="w-full"
            style={{
              height: Math.min(listHeight, 320),
            }}
            totalListHeightChanged={setListHeight}
            data={allElements}
            computeItemKey={(index) => allElements[index].id}
            components={{
              EmptyPlaceholder: () => (
                <div className="size-full flex flex-col gap-1 justify-center items-center select-none text-gray-400">
                  <BsEmojiTear className="size-8"/>
                  Nobody here...
                </div>
              ),
            }}
            itemContent={(_, item) => (
              <UserNameplate.Root
                className="p-1.5 hover-highlight rounded-md cursor-pointer"
                userId={item.id}
                avatarVersion={item.avatarVersion}
                displayName={item.displayName ?? "???"}
                onClick={() => {
                  setUsers([item]);
                  onSelect?.(item);
                }}
              />
            )}
          />
        </div>
      )}
    </>
  );
}

export const Suggestion = {
  Mode: SelectMode,
  Emoji: EmojiMode,
  Time: TimeMode,
  Mention: MentionMode,
}