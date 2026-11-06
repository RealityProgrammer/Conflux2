import {FaSearch} from "react-icons/fa";
import IconButton from "../IconButton.tsx";
import {useEffect, useState} from "react";
import {Label, Popover, Separator} from "radix-ui";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import {useHistoryConversationSearchStore} from "../../store/useHistoryConversationSearchStore.ts";
import {TruncatedText} from "../TruncatedText.tsx";
import {Avatar} from "../Avatar.tsx";
import {FaPlus, FaXmark} from "react-icons/fa6";
import {useDebounceValue} from "usehooks-ts";
import {Virtuoso} from "react-virtuoso";
import {useInfiniteGetConversationParticipantsForSearchQuery} from "../../graphql/infiniteQueries.ts";
import {data} from "react-router";
import {UserNameplate} from "../UserNameplate.tsx";
import VirtualizedScrollList2 from "../VirtualizedScrollList2.tsx";
import type {UserIdentityProfileDto} from "../../api/types.ts";
import {BsCheckLg} from "react-icons/bs";
import DateTimeRangePicker from "../DateTimeRangePicker.tsx";

interface SearchRequest {
  content: string;
  filterSenderIds: string[];
}

export default function SearchMessagesButton() {
  const { conversationId } = useChatContainerContext();

  const searchHistory = useHistoryConversationSearchStore(state => state.searchHistory[conversationId]) ?? [];
  const setSearchHistory = useHistoryConversationSearchStore(state => state.setSearchHistory);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [searchRequest, setSearchRequest] = useState<SearchRequest>({ content: '', filterSenderIds: [] });

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setSearchQuery('');
      }

      setIsOpen(open);
    }}>
      <Popover.Trigger asChild>
        <IconButton theme="default">
          <FaSearch className="size-5"/>
        </IconButton>

      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={5}
          align="end"
          className="w-96 h-128 max-h-(--radix-popover-content-available-height) border-2 border-gray-600 rounded-lg bg-gray-725 text-white shadow-lg flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className="flex-none p-2 border-b-2 border-b-gray-600">
            <input
              type="text"
              placeholder="Enter query here"
              className="input-field h-9 text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </header>

          <section className="flex-1 min-h-0 px-2 py-2 overflow-x-hidden overflow-y-auto scrollbar-none">
            <p className="group-label">Filtering</p>

            <div className="space-y-1">
              <Label.Root className="block label mb-1">Sender{searchRequest.filterSenderIds.length > 1 ? 's' : ''}</Label.Root>

              <SenderFilter
                addUserId={(id) => {
                  setSearchRequest((prev: SearchRequest): SearchRequest => ({
                    ...prev,
                    filterSenderIds: [...prev.filterSenderIds, id],
                  }));
                }}
                removeUserId={(id) => {
                  setSearchRequest((prev: SearchRequest): SearchRequest => ({
                    ...prev,
                    filterSenderIds: prev.filterSenderIds.filter(v => v !== id),
                  }));
                }}
              />

              <Label.Root className="block label mb-1">Time</Label.Root>

              <DateTimeRangePicker
                className="input-field h-9 w-full"
              />
            </div>

            {/*<Separator.Root className="horizontal-separator my-2 "/>*/}

            {/*<p className="group-label">History</p>*/}

            {/*<div className="space-y-1">*/}
            {/*  {searchHistory.map((q, i) => (*/}
            {/*    <button*/}
            {/*      type="button"*/}
            {/*      key={`${q} - ${i}`}*/}
            {/*      className="w-full text-left text-sm hover-highlight p-1.5 rounded-md cursor-pointer flex flex-row gap-2 items-center"*/}
            {/*      onClick={() => executeSearch(q)}*/}
            {/*    >*/}
            {/*      <FaSearch className="flex-none size-5 fill-white inline"/>*/}
            {/*      <TruncatedText className="flex-1">{q}</TruncatedText>*/}
            {/*    </button>*/}
            {/*  ))}*/}
            {/*</div>*/}
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SenderFilter({
  addUserId,
  removeUserId,
}: { addUserId: (id: string) => void; removeUserId: (id: string) => void; }) {
  const [selectedUsers, setSelectedUsers] = useState<UserIdentityProfileDto[]>([]);

  return (
    <div className="p-2 flex flex-row flex-wrap gap-2 border-2 border-gray-600 rounded-lg bg-black/10">
      <AddSenderFilterButton
        selectedUsers={selectedUsers}
        onUserToggle={(user) => {
          const index = selectedUsers.findIndex(u => u.id === user.id);

          if (index === -1) {
            setSelectedUsers((prev: UserIdentityProfileDto[]): UserIdentityProfileDto[] => [...prev, user]);
            addUserId(user.id);
          } else {
            setSelectedUsers((prev: UserIdentityProfileDto[]): UserIdentityProfileDto[] => prev.filter((_user, index) => index !== index));
            removeUserId(user.id);
          }
        }}
      />

      {selectedUsers.map((u, index) => (
        <span
          key={u.id}
          className="p-1 bg-gray-600 rounded-md text-sm flex flex-row gap-2"
        >
          <Avatar.User
            userId={u.id}
            version={u.avatarVersion}
            className="size-5 rounded-full"
          />

          {u.displayName}

          <IconButton
            theme="default"
            onClick={() => {
              setSelectedUsers((prev: UserIdentityProfileDto[]): UserIdentityProfileDto[] => prev.filter((_user, i) => index !== i));
              removeUserId(u.id);
            }}
          >
            <FaXmark className="size-4"/>
          </IconButton>
        </span>
      ))}
    </div>
  );
}

function AddSenderFilterButton({
  selectedUsers,
  onUserToggle
}: { selectedUsers: UserIdentityProfileDto[]; onUserToggle: (user: UserIdentityProfileDto) => void; }) {
  const { conversationId } = useChatContainerContext();

  const [isOpen, setIsOpen] = useState(false);
  const [nameSearch, setNameSearch] = useDebounceValue("", 500);

  const { data, isError, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteGetConversationParticipantsForSearchQuery(
    { conversationId, nameFilter: nameSearch },
    {
      enabled: nameSearch.length > 0,
      initialPageParam: { after: null },
      getNextPageParam: (lastPage) => {
        const pageInfo = lastPage?.conversationParticipants.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
      refetchOnWindowFocus: false,
    }
  );

  const allParticipants = data?.pages.flatMap((page) => page?.conversationParticipants.nodes ?? []) ?? [];

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <IconButton theme="default" className="bg-gray-600 rounded-md p-1.5">
          <FaPlus className="size-4 fill-white"/>
        </IconButton>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={5}
          className="w-64 h-80 max-h-(--radix-popover-content-available-height) border-2 border-gray-600 rounded-lg bg-gray-725 text-white shadow-lg flex flex-col"
        >
          <header className="flex-none p-2 border-b-2 border-b-gray-600">
            <input
              type="text"
              placeholder="Enter sender name"
              className="input-field h-9 w-full text-sm"
              onChange={(e) => setNameSearch(e.target.value)}
            />
          </header>

          <section className="flex-1 min-h-0 pt-1">
            <VirtualizedScrollList2
              data={allParticipants}
              showBottomLoader={isFetchingNextPage}
              endReached={() => {
                if (hasNextPage) {
                  fetchNextPage();
                }
              }}
              showTopLoader={false}
              overscan={10}
              className="h-full"
              computeItemKey={(index) => allParticipants[index].user.id}
              renderEmpty={() => (
                <div className="size-full flex flex-col gap-1 justify-center items-center">
                  { nameSearch.length > 0 ? (
                    <p className="select-none text-gray-500 text-sm">Enter name of sender</p>
                  ) : (
                    <p className="select-none text-gray-500 text-sm">So very empty here...</p>
                  )}
                </div>
              )}
              renderItem={(_, participant) => {
                return (
                  <div className="px-1">
                    <UserNameplate.Root
                      userId={participant.user.id}
                      avatarVersion={participant.user.avatarVersion}
                      displayName={participant.user.displayName ?? "???"}
                      className="p-1.5 cursor-pointer hover-highlight rounded-md"
                      onClick={() => {
                        onUserToggle(participant.user);
                        setIsOpen(false);
                      }}
                    >
                      { selectedUsers.some(u => u.id === participant.user.id) ? (
                        <BsCheckLg className="size-4 fill-white"/>
                      ) : null }
                    </UserNameplate.Root>
                  </div>
                );
              }}
            />
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}