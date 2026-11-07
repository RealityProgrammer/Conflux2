import {FaSearch} from "react-icons/fa";
import IconButton from "../IconButton.tsx";
import {useState} from "react";
import {Label, Popover, Select, Separator, Tooltip} from "radix-ui";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import {type SearchRequest, useHistoryConversationSearchStore} from "../../store/useHistoryConversationSearchStore.ts";
import {Avatar} from "../Avatar.tsx";
import {FaPlus, FaThumbtack, FaThumbtackSlash, FaXmark} from "react-icons/fa6";
import {useDebounceValue} from "usehooks-ts";
import {useInfiniteGetConversationParticipantsForSearchQuery} from "../../graphql/infiniteQueries.ts";
import {UserNameplate} from "../UserNameplate.tsx";
import VirtualizedScrollList2 from "../VirtualizedScrollList2.tsx";
import type {MessageSearchDto, UserIdentityProfileDto} from "../../api/types.ts";
import {
  BsCalendarFill,
  BsCheckLg,
  BsChevronDown,
  BsChevronLeft,
  BsExclamationTriangle,
  BsQuestionLg
} from "react-icons/bs";
import DateTimeRangePicker from "../DateTimeRangePicker.tsx";
import {TruncatedText} from "../TruncatedText.tsx";
import {MessageRow} from "./MessageRow.tsx";
import useMessageSearchQuery from "../../hooks/useMessageSearchQuery.ts";
import {formatDate} from "date-fns";
import MessageBody from "./MessageBody.tsx";
import MessageAttachments from "./MessageAttachments.tsx";
import SelectItem from "../SelectItem.tsx";
import {MessagePinFilter} from "../../api/schema.ts";

export default function SearchMessagesButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"filter" | "result">("filter");

  const [searchRequest, setSearchRequest] = useState<SearchRequest>({
    content: '',
    senderIds: [],
    timeRange: undefined,
    pin: MessagePinFilter.Unspecified,
  });

  const onSearchRequested = (searchRequest: SearchRequest) => {
    setSearchRequest(searchRequest);
    setMode("result");
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setSearchRequest({ content: '', senderIds: [], timeRange: undefined });
        setMode("filter");
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
          {mode === "filter" ? (
            <FilteringView
              searchRequest={searchRequest}
              setSearchRequest={setSearchRequest}
              onSearchRequested={onSearchRequested}
            />
          ) : (
            <ResultView
              searchRequest={searchRequest}
              navigateBackward={() => {
                setMode("filter");
              }}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface FilteringViewProps {
  searchRequest: SearchRequest;
  setSearchRequest: (value: SearchRequest | ((prev: SearchRequest) => SearchRequest)) => void;
  onSearchRequested: (searchRequest: SearchRequest) => void;
}

function FilteringView({
  searchRequest,
  setSearchRequest,
  onSearchRequested,
}: FilteringViewProps) {
  const { conversationId } = useChatContainerContext();

  const searchHistory = useHistoryConversationSearchStore(state => state.searchHistory[conversationId]) ?? [];
  const registerSearchRequest = useHistoryConversationSearchStore(state => state.registerSearchRequest);
  const removeSearchRequest = useHistoryConversationSearchStore(state => state.removeSearchRequest);

  const handleSearch = (request: SearchRequest) => {
    registerSearchRequest(conversationId, request);
    onSearchRequested(request);
  }

  return (
    <>
      <header className="flex-none p-2 border-b-2 border-b-gray-600 flex flex-row gap-2 items-center">
        <input
          type="text"
          placeholder="Enter query here"
          className="flex-1 input-field h-9 text-sm w-full"
          value={searchRequest.content}
          onChange={(e) => setSearchRequest((prev: SearchRequest): SearchRequest => ({
            ...prev,
            content: e.target.value,
          }))}
        />

        <button
          className="flex-none button-theme-primary p-2 rounded-md cursor-pointer"
          onClick={() => handleSearch(searchRequest)}
        >
          <FaSearch className="size-4 fill-white"/>
        </button>
      </header>

      <section className="flex-1 min-h-0 px-2 py-2 overflow-x-hidden overflow-y-auto scrollbar-none">
        <p className="group-label">Filtering</p>

        <div className="space-y-1">
          <Label.Root className="block label mb-1">Sender{searchRequest.senderIds.length > 1 ? 's' : ''}</Label.Root>

          <SenderFilter
            addUserId={(id) => {
              setSearchRequest((prev: SearchRequest): SearchRequest => ({
                ...prev,
                senderIds: [...prev.senderIds, id],
              }));
            }}
            removeUserId={(id) => {
              setSearchRequest((prev: SearchRequest): SearchRequest => ({
                ...prev,
                senderIds: prev.senderIds.filter(v => v !== id),
              }));
            }}
          />

          <Label.Root className="block label mb-1 mt-2">Time</Label.Root>

          <DateTimeRangePicker
            className="input-field h-9 w-full"
            value={searchRequest.timeRange}
            onChange={(value) => {
              setSearchRequest((prev: SearchRequest): SearchRequest => ({
                ...prev,
                timeRange: value,
              }))
            }}
          />

          <Label.Root className="block label mb-1 mt-2">Pin</Label.Root>

          <Select.Root value={searchRequest.pin as string} onValueChange={(value) => {
            setSearchRequest((prev) => ({
              ...prev,
              pin: value as MessagePinFilter,
            }));
          }}>
            <Select.Trigger className="w-full input-field h-9 inline-flex flex-row items-center gap-2 text-sm">
              <Select.Value placeholder="Unspecified"/>

              <Select.Icon className="fill-white flex-none ml-auto">
                <BsChevronDown className="size-4"/>
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="z-2001 overflow-hidden bg-gray-650 text-white rounded-md p-1 w-(--radix-select-trigger-width)"
                position="popper"
                side="bottom"
                sideOffset={4}
              >
                <Select.Viewport>
                  {Object.entries(MessagePinFilter).map(([name, value]) => (
                    <SelectItem
                      key={value}
                      text={name}
                      value={value}
                    />
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        <Separator.Root className="horizontal-separator my-2"/>

        <p className="group-label">History</p>

        <div className="space-y-1">
          {searchHistory.map((request, index) => (
            <div
              key={`${request.content} - ${index}`}
              className="w-full text-left text-sm hover-highlight p-1.5 rounded-md cursor-pointer flex flex-row gap-2 items-center"
              onClick={() => setSearchRequest(request)}
            >
              <FaSearch className="flex-none size-5 fill-white"/>

              {request.content && request.content.length > 0 ? (
                <TruncatedText className="flex-1 min-w-0">{request.content}</TruncatedText>
              ) : (
                <i className="flex-1 min-w-0 text-gray-400">&lt;no content&gt;</i>
              )}

              {request.timeRange && (request.timeRange.start || request.timeRange.end) && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <BsCalendarFill className="flex-none size-4 fill-white"/>
                  </Tooltip.Trigger>

                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      sideOffset={8}
                      className="rounded-md shadow-md bg-gray-750 text-white p-2 border-2 border-gray-600 text-sm"
                    >
                      {request.timeRange.start && !request.timeRange.end ? (
                        <p>Since {formatDate(request.timeRange.start, "yyyy/MM/dd HH:mm:ss")}</p>
                      ) : !request.timeRange.start && request.timeRange.end ? (
                        <p>Until {formatDate(request.timeRange.end, "yyyy/MM/dd HH:mm:ss")}</p>
                      ) : request.timeRange.start && request.timeRange.end ? (
                        <p>From {formatDate(request.timeRange.start, "yyyy/MM/dd HH:mm:ss")} to {formatDate(request.timeRange.end, "yyyy/MM/dd HH:mm:ss")}</p>
                      ) : null}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              )}

              {request.pin === MessagePinFilter.Pin ? (
                <FaThumbtack className="flex-none size-4 fill-white"/>
              ) : request.pin === MessagePinFilter.Unpin ? (
                <FaThumbtackSlash className="flex-none size-4 fill-white"/>
              ) : null}

              <IconButton
                type="button"
                theme="default"
                className="flex-none"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSearchRequest(conversationId, index);
                }}
              >
                <FaXmark className="size-5"/>
              </IconButton>
            </div>
          ))}
        </div>
      </section>
    </>
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
            {isLoading ? (
              <div className="overflow-hidden size-full">
                {Array.from({length: 20}, (_, i) => (
                  <UserNameplate.Skeleton
                    key={i}
                    className="p-1.5"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="size-full flex flex-col gap-1 justify-center items-center">
                <BsExclamationTriangle className="size-6 fill-white"/>
                <p className="text-center select-none text-sm">Failed to load users.</p>
              </div>
            ) : (
              <VirtualizedScrollList2
                data={allParticipants}
                showBottomLoader={isFetchingNextPage}
                endReached={() => {
                  if (hasNextPage && !isFetchingNextPage && !isLoading) {
                    fetchNextPage();
                  }
                }}
                showTopLoader={false}
                overscan={10}
                className="h-full"
                computeItemKey={(index) => allParticipants[index].user.id}
                renderEmpty={() => (
                  <div className="size-full flex flex-col gap-1 justify-center items-center">
                    { !nameSearch || nameSearch.length === 0 ? (
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
            )}
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

interface ResultViewProps {
  searchRequest: SearchRequest;
  navigateBackward: () => void;
}

type SearchRenderItem =
  { type: "date"; date: Date; } |
  { type: "message"; message: MessageSearchDto; };

function ResultView({
  searchRequest,
  navigateBackward,
}: ResultViewProps) {
  const { conversationId, requestJump } = useChatContainerContext();
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useMessageSearchQuery(
    {conversationId, request: searchRequest},
    {
      staleTime: 0,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const rawMessages = data?.pages.flatMap((page) => page?.messages ?? []) ?? [];

  const renderItems: SearchRenderItem[] = [];
  let lastDate: Date | null = null;

  for (const rawMessage of rawMessages) {
    const messageDate = new Date(rawMessage.createdAt);

    if (!lastDate || messageDate.getDay() !== lastDate.getDay()) {
      renderItems.push({
        type: "date",
        date: messageDate,
      });

      lastDate = messageDate;
    }

    renderItems.push({
      type: "message",
      message: rawMessage,
    });
  }

  return (
    <>
      <header className="flex-none p-2 border-b-2 border-b-gray-600 flex flex-row gap-2 justify-start items-center">
        <IconButton
          theme="default"
          onClick={navigateBackward}
          className="flex-none"
        >
          <BsChevronLeft className="size-4"/>
        </IconButton>

        <span>Back</span>
      </header>

      <section className="flex-1 min-h-0 px-2 py-2 overflow-x-hidden overflow-y-auto scrollbar-none">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({length: 10}, (_, i) => (
              <MessageRow.HeaderSkeleton key={i}>
                <MessageRow.BodySkeleton/>
              </MessageRow.HeaderSkeleton>
            ))}
          </div>
        ) : isError ? (
          <div className="size-full flex flex-col gap-1 justify-center items-center">
            <BsExclamationTriangle className="size-6 fill-white"/>
            <p className="text-center select-none text-sm">Failed to search messages.</p>
          </div>
        ) : (
          <VirtualizedScrollList2
            data={renderItems}
            computeItemKey={(index) => {
              const item = renderItems[index];
              return `${item.type}-${item.type === "message" ? item.message.id : item.date}`
            }}
            className="h-full scrollbar-none"
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage && !isLoading) {
                fetchNextPage();
              }
            }}
            showTopLoader={false}
            showBottomLoader={isFetchingNextPage}
            overscan={10}
            renderEmpty={() => (
              <div className="size-full flex flex-col gap-1 justify-center items-center">
                <BsQuestionLg className="size-6 fill-white"/>
                <p className="text-center select-none text-sm">Well that was awkward, nothing is here...</p>
              </div>
            )}
            renderItem={(_index, item) => {
              switch (item.type) {
                case "date":
                  return (
                    <div className="select-none font-bold text-lg flex flex-row items-center gap-2 pb-2">
                      <BsCalendarFill className="size-4 fill-white inline"/>
                      {formatDate(item.date, "yyyy/MM/dd")}
                    </div>
                  );

                case "message":
                  const message = item.message;

                  return (
                    <div className="pb-2">
                      <div
                        className="hover-highlight p-1.5 rounded-md border-2 border-gray-600 cursor-pointer max-h-96 overflow-hidden"
                        onClick={() => {
                          requestJump(message.id);
                        }}
                      >
                        <MessageRow.Row
                          header={{
                            senderDisplayName: message.sender?.displayName ?? "???",
                            senderId: message.sender.id,
                            senderAvatarVersion: message.sender.avatarVersion,
                            avatarAlt: `Avatar of ${message.sender.displayName ?? "???"}`,
                          }}
                          date={new Date(message.createdAt)}
                        >
                          <div className="flex-1 space-y-1">
                            <MessageBody
                              content={message.body}
                            />

                            {message.attachments && message.attachments.length > 0 && (
                              <MessageAttachments attachments={message.attachments} onAttachmentClick={() => {}}/>
                            )}
                          </div>
                        </MessageRow.Row>
                      </div>
                    </div>
                  );

                default: return null;
              }
            }}
          />
        )}
      </section>
    </>
  );
}