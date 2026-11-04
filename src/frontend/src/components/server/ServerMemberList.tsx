import {
  type GetServerMembersQuery,
  type GetServerRolesByServerIdQuery,
  useGetServerMembersQuery,
  useInfiniteGetServerMembersQuery
} from "../../graphql/infiniteQueries.ts";
import {UserNameplate} from "../UserNameplate.tsx";
import {useConversationContext} from "../../contexts/ConversationContext.tsx";
import VirtualizedScrollList2 from "../VirtualizedScrollList2.tsx";
import {BsExclamationTriangle} from "react-icons/bs";

export default function ServerMemberList() {
  const { source } = useConversationContext();

  if (source.type !== "server-channel") return null;

  return (
    <MemberList serverId={source.serverId}/>
  );
}

function MemberList({ serverId }: { serverId: string }) {
  const { renderItems, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage } = useGroupedServerMembers(serverId);

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 25 }, (_, i) => (
          <UserNameplate.Skeleton key={i} className="p-1.5"/>
        ))}
      </>
    );
  }

  if (isError) {
    return (
      <div className="size-full flex flex-col gap-1 justify-center items-center">
        <BsExclamationTriangle className="size-8 fill-white"/>
        <p className="text-center select-none">Failed to load member list.</p>
      </div>
    );
  }

  return (
    <VirtualizedScrollList2
      data={renderItems}
      renderItem={(_index: number, data: RenderItem) => {
        switch (data.type) {
          case "header":
            return <p className="group-label m-0! pt-3 pb-1 px-2">{data.roleName}</p>

          case "member":
            const memberUserInfo = data.member.user;

            return (
              <div className="px-2">
                <UserNameplate.Root
                  userId={memberUserInfo.id}
                  displayName={memberUserInfo.displayName ?? "???"}
                  avatarVersion={memberUserInfo.avatarVersion}
                  className="p-1.5 rounded-md hover-highlight"
                />
              </div>
            )
        }
      }}
      computeItemKey={(index) => {
        const item = renderItems[index];
        return item.type === "header" ? `header-${item.roleId}` : `member-${item.member.user.id}`;
      }}
      showBottomLoader={isFetchingNextPage}
      endReached={() => {
        fetchNextPage();
      }}
      showTopLoader={false}
      overscan={10}
      className="h-full"
    />
  );
}

type RenderItem =
  | { type: 'header'; roleId: string; roleName: string; }
  | { type: 'member'; member: NonNullable<GetServerMembersQuery["communityServerMembers"]["nodes"]>[number] };

function useGroupedServerMembers(serverId: string) {
  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteGetServerMembersQuery(
    { serverId, after: null },
    {
      initialPageParam: { after: null },
      getNextPageParam: (lastPage): { after: string } | undefined => {
        const pageInfo = lastPage?.communityServerMembers.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
      refetchOnWindowFocus: false,
      staleTime: 15 * 30 * 1000,
    }
  );

  const rawMembers = data?.pages.flatMap((page) => page?.communityServerMembers?.nodes ?? []) ?? [];

  const renderItems: RenderItem[] = [];
  let lastRoleId: string | null = null;

  for (const member of rawMembers) {
    const role = member.highestAuthorizeRole;

    if (role.id !== lastRoleId) {
      renderItems.push({
        type: "header",
        roleId: role.id,
        roleName: role.name,
      });
      lastRoleId = role.id;
    }

    renderItems.push({ type: 'member', member });
  }

  return {
    renderItems,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  };
}