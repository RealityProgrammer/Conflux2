import {useDebounceValue} from "usehooks-ts";
import {useRef, useState} from "react";
import {Popover, Separator} from "radix-ui";
import {
  type ServerMemberSearchQuery,
  useInfiniteGetAssignableServerRolesByServerIdQuery,
  useInfiniteServerMemberSearchQuery,
} from "../../graphql/infiniteQueries.ts";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import VirtualizedScrollList from "../VirtualizedScrollList.tsx";
import {UserNameplate} from "../UserNameplate.tsx";
import UserAvatar from "../UserAvatar.tsx";
import DateTimeText from "../DateTimeText.tsx";
import {type InspectMemberQuery, useInspectMemberQuery, useUpdateMemberRolesMutation} from "../../graphql/queries.ts";
import Spinner from "../Spinner.tsx";
import {BsCheck, BsCircleFill, BsExclamationTriangle} from "react-icons/bs";
import IconButton from "../IconButton.tsx";
import {FaPlus, FaXmark} from "react-icons/fa6";
import {FaSave} from "react-icons/fa";
import {Controller, type SubmitHandler, useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {SpecialRoleType} from "../../graphql/types.ts";

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
                keyExtractor={(index) => allMembers[index].id}
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

  return <MemberInformationContent memberInfo={data.communityServerMemberById}/>
}

const updateMemberInformationSchema = z.object({
  roleIds: z.string().array(),
});

type UpdateMemberInformationFormValues = z.infer<typeof updateMemberInformationSchema>;

function MemberInformationContent({
  memberInfo
}: {memberInfo: NonNullable<InspectMemberQuery['communityServerMemberById']>}) {
  const { serverId } = useCommunityServerContext();

  const {
    handleSubmit,
    control,
    formState
  } = useForm<UpdateMemberInformationFormValues>({
    resolver: zodResolver(updateMemberInformationSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      roleIds: memberInfo.roles.filter(r => r.specialRoleType === SpecialRoleType.None).map(r => r.id),
    }
  });

  const updateMemberRolesMutation = useUpdateMemberRolesMutation({
    onError: (_error, _variables) => {
      // TODO: Error handling.
    }
  });

  const onSubmitModification: SubmitHandler<UpdateMemberInformationFormValues> = async (value: UpdateMemberInformationFormValues) => {
    await updateMemberRolesMutation.mutateAsync({
      serverId,
      memberId: memberInfo.id,
      roleIds: value.roleIds,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitModification)} className="relative overflow-y-hidden">
      <section className={`absolute ${formState.isDirty ? 'top-2 translate-y-0' : 'top-0 -translate-y-full'} right-2 transition-transform duration-400 ease-in-out p-2 bg-black/15 rounded-md flex flex-row items-center gap-2`}>
        <IconButton theme="danger">
          <FaXmark className="size-6"/>
        </IconButton>

        <IconButton theme="default">
          <FaSave className="size-6"/>
        </IconButton>
      </section>

      <div>
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
                {memberInfo.roles.sort(r => r.authorizeLevel).map((r) => {
                  return (
                    <span key={r.id} className="flex flex-row items-center gap-2 px-2 py-0.5 bg-black/12 rounded-sm shadow-sm">
                      <BsCircleFill className="size-2 fill-blue-500"/>

                      {r.name}
                    </span>
                  )
                })}

                <Controller
                  control={control}
                  name="roleIds"
                  render={({field}) => {
                    return (
                      <RoleModificationButton
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )
                  }}
                />
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
                {memberInfo.authorizeInfo.permissions.filter(p => p.isGranted).map((p) => {
                  return (
                    <span key={p.permission} className="flex flex-row items-center gap-2 px-2 py-0.5 bg-black/12 rounded-sm">
                      {p.permission}
                    </span>
                  )
                })}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </form>
  );
}

interface RoleModificationButtonProps {
  value: string[];
  onChange: (value: string[]) => void;
}

function RoleModificationButton({
  value,
  onChange,
}: RoleModificationButtonProps) {
  const { serverId, memberPermissions } = useCommunityServerContext();
  const [searchValue, setSearchValue] = useDebounceValue("", 500);

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteGetAssignableServerRolesByServerIdQuery(
    { serverId, nameFilter: searchValue, after: null, authorizeLevel: memberPermissions.authorizeLevel },
    {
      initialPageParam: { after: null },
      getNextPageParam: (lastPage) => {
        const pageInfo = lastPage?.communityServerRolesByServerId?.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
      staleTime: 30 * 60 * 1000,
    }
  );

  const allElements = data?.pages.flatMap((page) => page?.communityServerRolesByServerId?.nodes ?? []) ?? [];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton theme="default" className="size-6 bg-black/12 rounded-sm shadow-sm">
          <FaPlus className="size-4"/>
        </IconButton>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={5}
          align="center"
          className="rounded-lg bg-gray-650 text-sm font-medium text-white shadow-lg animate-in fade-in zoom-in duration-200 h-64 overflow-hidden flex flex-col gap-1"
          onWheel={(e) => e.stopPropagation()}
          onOpenAutoFocus={(e) => e.stopPropagation()}
        >
          <div className="px-1 pt-1">
            <input
              type="text"
              placeholder="Enter name"
              className="flex-none text-sm input-field py-2 px-2"
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <VirtualizedScrollList
            viewportClassName="overflow-y-auto w-full"
            itemCount={allElements.length}
            keyExtractor={(index) => allElements[index].id}
            isLoading={isLoading}
            estimateSize={() => 32}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={() => {
              fetchNextPage();
            }}
            renderSkeletonItem={() => (
              <li className="h-8 flex flex-row items-center gap-2 px-1">
                <BsCircleFill className="size-2.5 fill-white/10 animate-pulse"/>
                <span className="h-4 w-32 bg-white/10 animate-pulse rounded"></span>
              </li>
            )}
            renderItem={(itemIndex) => {
              const role = allElements[itemIndex];
              const isSelected = value.includes(role.id);

              return (
                <button
                  type="button"
                  className="dropdown-item-default flex flex-row items-center w-full gap-2"
                  onClick={() => {
                    if (isSelected) {
                      onChange(value.filter((id) => id !== role.id));
                    } else {
                      onChange([...value, role.id]);
                    }
                  }}
                >
                  <BsCircleFill className="size-2.5 fill-blue-500"/>

                  <span className="flex-1 text-left truncate min-w-0">
                    {role.name}
                  </span>

                  {isSelected && <BsCheck className="size-5 fill-white flex-none" />}
                </button>
              );
            }}
            hideVerticalScrollbar
          />

          <Popover.Arrow className="fill-gray-650" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}