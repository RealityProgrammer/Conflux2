import {useDebounceValue} from "usehooks-ts";
import {useRef, useState} from "react";
import {Popover, Separator} from "radix-ui";
import {
  type GetServerRolesByServerIdQuery, type ServerMemberSearchQuery,
  useInfiniteServerMemberSearchQuery,
  useServerMemberSearchQuery
} from "../../graphql/infiniteQueries.ts";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import VirtualizedScrollList from "../VirtualizedScrollList.tsx";
import {UserNameplate} from "../UserNameplate.tsx";
import UserAvatar from "../UserAvatar.tsx";
import DateTimeText from "../DateTimeText.tsx";
import ErrorPopover from "../ErrorPopover.tsx";
import {useInspectMemberQuery} from "../../graphql/queries.ts";
import Spinner from "../Spinner.tsx";
import {BsCircleFill, BsExclamationTriangle} from "react-icons/bs";

export default function MemberManagement() {
  const { serverId } = useCommunityServerContext();

  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [searchValue, setSearchValue] = useDebounceValue("", 500);

  const isDebouncing = inputValue !== searchValue;

  const [isShowingSearchResults, setIsShowingSearchResults] = useState(false);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteServerMemberSearchQuery({
    serverId,
    after: null,
    search: searchValue,
  }, {
    initialPageParam: { after: null },
    getNextPageParam: (lastPage: ServerMemberSearchQuery): { after: string } | undefined => {
      const pageInfo = lastPage?.communityServerMembersFromServerId?.pageInfo;

      if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
        return { after: pageInfo.endCursor };
      }

      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  const allMembers = data?.pages.flatMap((page) => page?.communityServerMembersFromServerId?.nodes ?? []) ?? [];

  const [inspectingMemberId, setInspectingMemberId] = useState<string | undefined>(undefined);

  return (
    <>
      <header className="flex-none mb-0">
        <h3 className="text-xl font-bold text-white">Member Management</h3>
        <p className="text-sm text-gray-400">
          Inspecting member like a <s>creep</s> private detective...
        </p>
      </header>

      <main className="flex-1 flex flex-col space-y-2">
        <Popover.Root open={isShowingSearchResults} onOpenChange={setIsShowingSearchResults} modal={false}>
          <Popover.Anchor asChild>
            <input
              ref={inputRef}
              type="text"
              className="flex-none w-full h-11 input-field text-sm"
              placeholder="Enter name, user ID or member ID..."
              onChange={(e) => {
                const value = e.target.value;

                setInputValue(value);
                setSearchValue(value);
                setIsShowingSearchResults(e.target.value.length > 0);
              }}
              onFocus={() => setIsShowingSearchResults(inputValue.length > 0)}
            />
          </Popover.Anchor>

          <Popover.Portal>
            <Popover.Content
              side="bottom"
              sideOffset={5}
              className="w-(--radix-popover-trigger-width) max-h-64 overflow-hidden border-2 border-gray-600 bg-gray-700 text-white rounded-lg shadow-lg"
              onWheel={(e) => e.stopPropagation()}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                if (e.target === inputRef.current) {
                  e.preventDefault();
                }
              }}
            >
              <VirtualizedScrollList
                itemCount={isDebouncing ? 0 : allMembers.length}
                isLoading={isLoading || isDebouncing}
                estimateSize={() => 48}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                viewportClassName="overflow-y-auto max-h-64 w-full"
                fetchNextPage={() => {
                  fetchNextPage();
                }}
                renderEmpty={() => (
                  <p className="text-white text-center text-sm py-3">Nobody here...</p>
                )}
                renderSkeletonItem={(index: number) => {
                  return (
                    <UserNameplate.Skeleton
                      key={index}
                      className="p-1 h-12"
                    />
                  );
                }}
                renderItem={(itemIndex) => {
                  const member = allMembers[itemIndex];

                  return (
                    <UserNameplate.Root
                      key={member.id}
                      userId={member.user.id}
                      hasAvatar={member.user.hasAvatar}
                      displayName={member.user.displayName ?? "???"}
                      userName={member.user.userName ?? "???"}
                      className="p-1 hover-highlight cursor-pointer w-full"
                      onClick={() => {
                        setIsShowingSearchResults(false);
                        setInspectingMemberId(member.id);
                      }}
                    />
                  );
                }}
                hideVerticalScrollbar
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <div className="flex-1 min-h-0 border-2 border-gray-600 rounded-lg p-2">
          {inspectingMemberId ? (
            <MemberInformation memberId={inspectingMemberId}/>
          ) : (
            <div className="size-full flex flex-row justify-center items-center">
              <p className="select-none text-gray-500">Gotta search for the member first, boss...</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function MemberInformation({memberId}: {memberId: string}) {
  const { data, isLoading, isError } = useInspectMemberQuery({ id: memberId });

  if (isLoading) {
    return (
      <div className="size-full flex flex-row justify-center items-center">
        <Spinner className="size-8 fill-white"/>
      </div>
    );
  }

  if (isError || !data?.communityServerMemberById) {
    return (
      <div className="size-full flex flex-col justify-center items-center gap-y-2">
        <BsExclamationTriangle className="size-8 fill-white"/>
        <span>Failed to load member information...</span>
      </div>
    );
  }

  const memberInfo = data.communityServerMemberById!;

  return (
    <>
      <div className="space-y-2">
        <h4 className="group-label">
          User Information
        </h4>

        <div className="flex flex-row items-center gap-2">
          <UserAvatar
            hasAvatar={memberInfo.user.hasAvatar}
            className="flex-none size-10 rounded-full overflow-hidden"
            userId={memberInfo.user.id}
          />

          <span className="font-semibold">{memberInfo.user.displayName}</span>
          <span className="text-sm text-gray-400">@{memberInfo.user.userName}</span>
        </div>
      </div>

      <div className="space-y-2 mt-2">
        <h4 className="group-label">
          Member Information
        </h4>

        <ul className="bg-gray-700 border-2 border-gray-600 rounded-lg p-3 flex flex-col shadow-sm text-sm font-medium text-zinc-300">
          <li className="flex items-center justify-between gap-2 px-2.5 py-1">
            <span>Join Date</span>

            <DateTimeText value={new Date(memberInfo.createdAt)}/>
          </li>

          <Separator.Root className="horizontal-separator my-3" />

          <li className="flex items-center justify-between gap-2 px-2.5 py-0.5">
            <span className="flex-1">Roles</span>

            <span className="flex-1 flex flex-row justify-end flex-wrap gap-2">
              {memberInfo.roles.map((value) => {
                return (
                  <span className="flex flex-row items-center gap-2 px-2 py-0.5 bg-black/12 rounded-sm">
                    <BsCircleFill className="size-2 fill-blue-500"/>

                    {value.name}
                  </span>
                )
              })}
            </span>
          </li>

          <Separator.Root className="horizontal-separator my-3" />

          <li className="flex items-center justify-between gap-2 px-2.5 py-1">
            <span>Authorize Level</span>

            <span className="font-mono">{memberInfo.authorizeInfo.authorizeLevel}</span>
          </li>

          <Separator.Root className="horizontal-separator my-3" />

          <li className="flex items-center justify-between gap-2 px-2.5 py-1">
            <span>Permissions</span>

            <span className="flex-1 flex flex-row justify-end flex-wrap gap-2">
              {memberInfo.authorizeInfo.permissions.filter(p => p.isGranted).map((value) => {
                return (
                  <span className="flex flex-row items-center gap-2 px-2 py-0.5 bg-black/12 rounded-sm">
                    {value.permission}
                  </span>
                )
              })}
            </span>
          </li>
        </ul>
      </div>
    </>
  )
}