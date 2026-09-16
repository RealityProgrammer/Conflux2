import {useDebounceValue} from "usehooks-ts";
import {createContext, useContext, useRef, useState} from "react";
import {Dialog as RadixDialog, Label, Popover, Separator} from "radix-ui";
import {
  useInfiniteSearchServerMemberForAdminQuery,
  useInfiniteGetAssignableServerRolesQuery, type SearchServerMemberForAdminQuery,
} from "../../graphql/infiniteQueries.ts";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import VirtualizedScrollList from "../VirtualizedScrollList.tsx";
import {UserNameplate} from "../UserNameplate.tsx";
import UserAvatar from "../UserAvatar.tsx";
import DateTimeText from "../DateTimeText.tsx";
import {
  type InspectMemberQuery, useBanServerMemberMutation,
  useInspectMemberQuery,
  useKickServerMemberMutation, useUnbanServerMemberMutation,
  useUpdateMemberRolesMutation, useWarnServerMemberMutation
} from "../../graphql/queries.ts";
import Spinner from "../Spinner.tsx";
import {BsCheck, BsCircleFill, BsExclamationTriangle, BsHammer} from "react-icons/bs";
import IconButton from "../IconButton.tsx";
import {FaPlus, FaXmark} from "react-icons/fa6";
import {FaSave} from "react-icons/fa";
import {Controller, type SubmitHandler, useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {MembershipStatus, ServerPermission, SpecialRoleType} from "../../graphql/types.ts";
import {useQueryClient} from "@tanstack/react-query";
import {toast} from "react-toastify";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  MemberRolesUpdatedEvent,
  ServerMemberKickedEvent,
  ServerRoleCreatedEvent,
  ServerRoleUpdatedEvent
} from "../../api/events.ts";
import DialogForm from "../DialogForm.tsx";
import ErrorText from "../ErrorText.tsx";
import DurationInput, {type DurationValue} from "../DurationInput.tsx";
import Dialog from "../Dialog.tsx";

type InspectingMemberContextResult = {
  inspectingMemberInfo: NonNullable<InspectMemberQuery["communityServerMemberForAdmin"]>;
  refreshInspectingMemberInfo: () => void;
  setBanExpiredAt: (value: string | null) => void;
  setWarnCount: (value: number) => void;
}

const InspectingMemberContext = createContext<InspectingMemberContextResult | undefined>(undefined);

export default function MemberManagement() {
  const { serverId } = useCommunityServerContext();

  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [searchValue, setSearchValue] = useDebounceValue("", 500);

  const isDebouncing = inputValue !== searchValue;

  const [isShowingSearchResults, setIsShowingSearchResults] = useState(false);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteSearchServerMemberForAdminQuery({
    serverId,
    after: null,
    search: searchValue,
  }, {
    enabled: !!searchValue,
    initialPageParam: { after: null },
    getNextPageParam: (lastPage: SearchServerMemberForAdminQuery): { after: string } | undefined => {
      const pageInfo = lastPage?.serverMemberSearchForAdmin?.pageInfo;

      if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
        return { after: pageInfo.endCursor };
      }

      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  const allMembers = data?.pages.flatMap((page) => page?.serverMemberSearchForAdmin?.nodes ?? []) ?? [];

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
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useInspectMemberQuery(
    { id: memberId },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  if (isLoading) {
    return (
      <div className="size-full flex flex-row justify-center items-center">
        <Spinner className="size-8 fill-white"/>
      </div>
    );
  }

  if (isError || !data?.communityServerMemberForAdmin) {
    return (
      <div className="size-full flex flex-col justify-center items-center gap-y-2">
        <BsExclamationTriangle className="size-8 fill-white"/>
        <span>Failed to load member information...</span>
      </div>
    );
  }

  const refreshInspectingMemberInfo = () => {
    queryClient.invalidateQueries({queryKey: useInspectMemberQuery.getKey({id: memberId})});
  };

  const setBanExpiredAt = (value: string | null) => {
    queryClient.setQueryData<InspectMemberQuery>(useInspectMemberQuery.getKey({id: memberId}), (oldData) => {
      if (!oldData || !oldData.communityServerMemberForAdmin) return oldData;

      return {
        ...oldData,
        communityServerMemberForAdmin: {
          ...oldData.communityServerMemberForAdmin,
          banExpireAt: value,
        },
      };
    });
  };

  const setWarnCount = (value: number) => {
    queryClient.setQueryData<InspectMemberQuery>(useInspectMemberQuery.getKey({id: memberId}), (oldData) => {
      if (!oldData || !oldData.communityServerMemberForAdmin) return oldData;

      return {
        ...oldData,
        communityServerMemberForAdmin: {
          ...oldData.communityServerMemberForAdmin,
          numWarn: value,
        },
      };
    });
  }

  return (
    <InspectingMemberContext.Provider value={{
      inspectingMemberInfo: data.communityServerMemberForAdmin,
      refreshInspectingMemberInfo,
      setBanExpiredAt,
      setWarnCount
    }}>
      <MemberInformationContent/>
    </InspectingMemberContext.Provider>
  )
}

const updateMemberInformationSchema = z.object({
  roleIds: z.string().array(),
});

type UpdateMemberInformationFormValues = z.infer<typeof updateMemberInformationSchema>;

function MemberInformationContent() {
  const { inspectingMemberInfo, refreshInspectingMemberInfo } = useContext(InspectingMemberContext)!;

  const { serverId, memberAuthorizeInfo } = useCommunityServerContext();

  const {
    handleSubmit,
    control,
    formState: { isDirty, isSubmitting },
    reset,
  } = useForm<UpdateMemberInformationFormValues>({
    resolver: zodResolver(updateMemberInformationSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      roleIds: inspectingMemberInfo.roles.filter(r => r.specialRoleType === SpecialRoleType.None).map(r => r.id),
    }
  });

  const updateMemberRolesMutation = useUpdateMemberRolesMutation({
    onSuccess: (_data, variables) => {
      reset({
        roleIds: Array.isArray(variables.roleIds) ? variables.roleIds : [variables.roleIds],
      });

      refreshInspectingMemberInfo();
    },

    onError: (_error, _variables) => {
      toast.error("Failed to update member roles.");
    }
  });

  const onSubmitModification: SubmitHandler<UpdateMemberInformationFormValues> = async (value: UpdateMemberInformationFormValues) => {
    await updateMemberRolesMutation.mutateAsync({
      serverId,
      memberId: inspectingMemberInfo.id,
      roleIds: value.roleIds,
    });
  };

  useSignalREvent("ServerRoleUpdated", (event: ServerRoleUpdatedEvent) => {
    if (event.serverId !== serverId) return;
    if (!inspectingMemberInfo.roles.map(r => r.id).includes(event.roleId)) return;

    refreshInspectingMemberInfo();
  });

  useSignalREvent("MemberRolesUpdated", (event: MemberRolesUpdatedEvent) => {
    if (event.serverId !== serverId) return;
    if (event.memberId !== inspectingMemberInfo.id) return;

    refreshInspectingMemberInfo();
  });

  return (
    <>
      <form onSubmit={handleSubmit(onSubmitModification)} className="relative overflow-y-hidden">
        <section className={`absolute ${isDirty ? 'top-2 translate-y-0' : 'top-0 -translate-y-full'} right-2 transition-transform duration-400 ease-in-out p-2 bg-black/15 rounded-md flex flex-row items-center gap-2`}>
          <IconButton type="button" theme="danger" onClick={() => {
            reset();
          }}>
            <FaXmark className="size-6"/>
          </IconButton>

          {isSubmitting ? (
            <Spinner className="size-6 fill-white"/>
          ) : (
            <IconButton type="submit" theme="default">
              <FaSave className="size-6"/>
            </IconButton>
          )}
        </section>

        <div>
          <div className="space-y-2">
            <h4 className="group-label">
              User Information
            </h4>

            <div className="flex flex-row items-center gap-2">
              <UserAvatar
                hasAvatar={inspectingMemberInfo.user.hasAvatar}
                className="flex-none size-10 rounded-full overflow-hidden"
                userId={inspectingMemberInfo.user.id}
              />

              <span className="font-semibold">{inspectingMemberInfo.user.displayName}</span>
              <span className="text-sm text-gray-400">@{inspectingMemberInfo.user.userName}</span>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            <h4 className="group-label">
              Member Information
            </h4>

            <ul className="bg-gray-700 border-2 border-gray-600 rounded-lg p-3 flex flex-col shadow-sm text-sm font-medium text-zinc-300">
              <li className="flex items-center justify-between gap-2 px-2.5 py-1">
                <span>Join Date</span>

                <DateTimeText value={new Date(inspectingMemberInfo.createdAt)}/>
              </li>

              <Separator.Root className="horizontal-separator my-3" />

              <li className="flex items-center justify-between gap-2 px-2.5 py-0.5">
                <span className="flex-1">Roles</span>

                <span className="flex-1 flex flex-row justify-end flex-wrap gap-2">
                  {inspectingMemberInfo.roles.sort(r => r.authorizeLevel).map((r) => {
                    return (
                      <span key={r.id} className="flex flex-row items-center gap-2 px-2 py-0.5 bg-black/12 rounded-sm shadow-sm">
                        <BsCircleFill className="size-2 fill-blue-500"/>

                        {r.name}
                      </span>
                    )
                  })}

                  {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.UpdateMemberRoles) && (
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
                  )}
                </span>
              </li>

              <Separator.Root className="horizontal-separator my-3" />

              <li className="flex items-center justify-between gap-2 px-2.5 py-1">
                <span>Authorize Level</span>

                <span className="font-mono">{inspectingMemberInfo.authorizeInfo.authorizeLevel}</span>
              </li>

              <Separator.Root className="horizontal-separator my-3" />

              <li className="flex items-center justify-between gap-2 px-2.5 py-1">
                <span>Permissions</span>

                {inspectingMemberInfo.authorizeInfo.permissions?.length > 0 ? (
                  <span className="flex-1 flex flex-row justify-end flex-wrap gap-2">
                    {inspectingMemberInfo.authorizeInfo.permissions.map((permission) => {
                      return (
                        <span key={permission} className="flex flex-row items-center gap-2 px-2 py-0.5 bg-black/12 rounded-sm">
                          {permission}
                        </span>
                      )
                    })}
                  </span>
                ) : (
                  <span className="text-gray-500 select-none">None</span>
                )}
              </li>

              <Separator.Root className="horizontal-separator my-3" />

              <li className="flex items-center justify-between gap-2 px-2.5 py-1">
                <span>Status</span>

                <span className="font-mono">{inspectingMemberInfo.status}</span>
              </li>

              <Separator.Root className="horizontal-separator my-3" />

              <li className="flex items-center justify-between gap-2 px-2.5 py-1">
                <span>Warn Count</span>

                <span className="font-mono">{inspectingMemberInfo.numWarn}</span>
              </li>

              {inspectingMemberInfo.banExpireAt && (
                <>
                  <Separator.Root className="horizontal-separator my-3" />

                  <li className="flex items-center justify-between gap-2 px-2.5 py-1">
                    <span>Ban Expired At</span>

                    {inspectingMemberInfo.banExpireAt === "9999-12-31T23:59:59.9999999Z" ? (
                      <span className="text-red-600">Death of the universe</span>
                    ) : (
                      <DateTimeText value={new Date(inspectingMemberInfo.banExpireAt)}/>
                    )}
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </form>

      <MemberActions/>
    </>
  );
}

function MemberActions() {
  const { inspectingMemberInfo, refreshInspectingMemberInfo } = useContext(InspectingMemberContext)!;
  const queryClient = useQueryClient();

  const setActiveStatusToKicked = () => {
    queryClient.setQueryData<InspectMemberQuery>(
      useInspectMemberQuery.getKey({id: inspectingMemberInfo.id}),
      (oldData) => {
        if (!oldData || !oldData.communityServerMemberForAdmin) return oldData;

        return {
          ...oldData,
          communityServerMember: {
            ...oldData.communityServerMemberForAdmin,
            status: MembershipStatus.Kicked,
          }
        };
      }
    );
  };

  useSignalREvent("ServerMemberKicked", (event: ServerMemberKickedEvent) => {
    if (event.kickedMemberId !== inspectingMemberInfo.id) return;

    setActiveStatusToKicked();
  });

  useSignalREvent("ServerMemberUnbanned", (event: ServerMemberKickedEvent) => {
    if (event.kickedMemberId !== inspectingMemberInfo.id) return;

    setActiveStatusToKicked();
  });

  const refreshBanExpireInfo = () => {
    refreshInspectingMemberInfo();
  };

  return (
    <div className="space-y-2 mt-2">
      <h4 className="group-label">
        Actions
      </h4>

      <div className="flex flex-row items-center gap-3">
        <KickMemberButton setActiveStatusToKicked={setActiveStatusToKicked}/>
        <WarnMemberButton/>
        <BanMemberButton refreshBanExpireInfo={refreshBanExpireInfo}/>
        <UnbanMemberButton onUnbanned={() => refreshInspectingMemberInfo()}/>
      </div>
    </div>
  );
}

const reasonSchema = z.object({
  reason: z.string().max(256, { error: "Reason can only have maximum length of 256 characters." }).optional(),
});

type KickMemberFormValues = z.infer<typeof reasonSchema>;

function KickMemberButton({
  setActiveStatusToKicked
}: {setActiveStatusToKicked: () => void}) {
  const { inspectingMemberInfo } = useContext(InspectingMemberContext)!;
  const { serverId, memberAuthorizeInfo } = useCommunityServerContext();

  const [openDialog, setOpenDialog] = useState(false);

  const formMethods = useForm<KickMemberFormValues>({
    resolver: zodResolver(reasonSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const { register, reset, formState: { isSubmitting, errors } } = formMethods;

  const kickMember = useKickServerMemberMutation({
    onSuccess: async () => {
      setOpenDialog(false);
      toast.success("Member has been kicked from the server.");
      setActiveStatusToKicked();
      reset();
    },
    onError: (_err) => {
      toast.error("Failed to kick member.");
    },
  });


  const handleSubmit: SubmitHandler<KickMemberFormValues> = async (data: KickMemberFormValues) => {
    kickMember.mutate({ serverId: serverId, memberId: inspectingMemberInfo.id, reason: data.reason });
  };

  return (
    <>
      <button
        type="button"
        disabled={inspectingMemberInfo.status !== MembershipStatus.Active || !memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.KickMembers) || isSubmitting}
        className="flex-1 px-4 h-12 text-sm text-white rounded-lg button-theme-danger2 cursor-pointer flex justify-center items-center"
        onClick={() => setOpenDialog(true)}
      >
        {isSubmitting ? (
          <Spinner className="size-6 fill-white"/>
        ) : (
          <>Kick Member</>
        )}
      </button>

      {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.KickMembers) && (
        <DialogForm
          open={openDialog}
          onOpenChange={(open) => {
            if (open) {
              setOpenDialog(true);
            } else {
              setOpenDialog(false);
              reset();
            }
          }}
          headerIcon={(<BsHammer className="size-10 fill-white"/>)}
          title="Kick Member"
          subtitle="Throw them into the grass field"
          contentClassName="centered-dialog rounded-xl text-white bg-gray-650 outline-none w-160"
          formMethods={formMethods}
          submitButton={(
            <button
              type="submit"
              className="button-theme-primary cursor-pointer h-10 rounded-md w-32 flex flex-row justify-center items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner className="size-5 fill-white"/>
              ) : (
                <>Kick Member</>
              )}
            </button>
          )}
          onSubmit={handleSubmit}
        >
          <p>
            Are you sure you want to kick this member?<br/>
            User can only rejoin the server if they have a valid invitation link.
          </p>

          <Label.Root className="block label mt-2 mb-1">Reason</Label.Root>

          <textarea
            className="input-field h-32 w-full resize-none px-3 py-2"
            placeholder="Enter reason (Optional)..."
            {...register("reason")}
          />

          {errors.reason && (
            <ErrorText className="mt-1">{errors.reason.message}</ErrorText>
          )}
        </DialogForm>
      )}
    </>
  )
}

type WarnMemberFormValues = z.infer<typeof reasonSchema>;

function WarnMemberButton() {
  const { inspectingMemberInfo, setWarnCount } = useContext(InspectingMemberContext)!;
  const { serverId, memberAuthorizeInfo } = useCommunityServerContext();

  const [openDialog, setOpenDialog] = useState(false);

  const warnMutation = useWarnServerMemberMutation({
    onSuccess: async () => {
      setOpenDialog(false);
      toast.success("Member has been warned.");
      setWarnCount(inspectingMemberInfo.numWarn + 1);
      reset();
    },
    onError: (_err) => {
      toast.error("Failed to warn member.");
    },
  });

  const formMethods = useForm<WarnMemberFormValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: {
      reason: undefined,
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const { register, reset, formState: { isSubmitting, errors } } = formMethods;

  return (
    <>
      <button
        type="button"
        disabled={!memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.WarnMembers) || warnMutation.isPending}
        className="flex-1 px-4 h-12 text-sm text-white rounded-lg button-theme-warning cursor-pointer flex justify-center items-center"
        onClick={() => setOpenDialog(true)}
      >
        {warnMutation.isPending ? (
          <Spinner className="size-6 fill-white"/>
        ) : (
          <>Warn Member</>
        )}
      </button>

      {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.WarnMembers) && (
        <DialogForm
          open={openDialog}
          onOpenChange={(open) => {
            if (open) {
              setOpenDialog(true);
            } else {
              setOpenDialog(false);
              reset();
            }
          }}
          headerIcon={(<BsHammer className="size-10 fill-white"/>)}
          title="Warn Member"
          subtitle="Somebody has been naughty..."
          contentClassName="centered-dialog rounded-xl text-white bg-gray-650 outline-none w-160"
          formMethods={formMethods}
          submitButton={(
            <button
              type="submit"
              className="button-theme-primary cursor-pointer h-10 rounded-md w-32 flex flex-row justify-center items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner className="size-5 fill-white"/>
              ) : (
                <>Warn Member</>
              )}
            </button>
          )}
          onSubmit={() => warnMutation.mutate({ serverId, memberId: inspectingMemberInfo.id })}
        >
          <p>
            Are you sure you want to warn this member?<br/>
          </p>

          <Label.Root className="block label mt-2 mb-1">Reason</Label.Root>

          <textarea
            className="input-field h-32 w-full resize-none px-3 py-2"
            placeholder="Enter reason (Optional)..."
            {...register("reason")}
          />

          {errors.reason && (
            <ErrorText className="mt-1">{errors.reason.message}</ErrorText>
          )}
        </DialogForm>
      )}
    </>
  )
}

const banMemberSchema = reasonSchema.and(z.object({
  duration: z.custom<DurationValue>().refine(val => {
    return val.days != 0 || val.hours != 0 || val.minutes != 0 || val.seconds != 0;
  }, { error: "Duration should not be zero." }),
}));

type BanMemberFormValues = z.infer<typeof banMemberSchema>;

function BanMemberButton({
  refreshBanExpireInfo,
}: {refreshBanExpireInfo: () => void}) {
  const { inspectingMemberInfo } = useContext(InspectingMemberContext)!;
  const { serverId, memberAuthorizeInfo } = useCommunityServerContext();

  const [openDialog, setOpenDialog] = useState(false);

  const formMethods = useForm<BanMemberFormValues>({
    resolver: zodResolver(banMemberSchema),
    defaultValues: {
      reason: undefined,
      duration: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const { register, reset, control, formState: { isSubmitting, errors } } = formMethods;

  const banMutation = useBanServerMemberMutation({
    onSuccess: async () => {
      setOpenDialog(false);
      toast.success("Member has been banned from the server.");
      refreshBanExpireInfo();
      reset();
    },
    onError: (_err) => {
      toast.error("Failed to ban member.");
    },
  });

  const handleSubmit: SubmitHandler<BanMemberFormValues> = async (data: BanMemberFormValues) => {
    // https://scalars.graphql.org/chillicream/duration.html
    const duration = data.duration;
    const durationString = `P${duration.days}DT${duration.hours}H${duration.minutes}M${duration.seconds}S`;

    banMutation.mutate({ serverId: serverId, memberId: inspectingMemberInfo.id, reason: data.reason, duration: durationString });
  };

  return (
    <>
      <button
        type="button"
        disabled={!memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.BanMembers) || isSubmitting}
        className="flex-1 px-4 h-12 text-sm text-white rounded-lg button-theme-danger cursor-pointer flex justify-center items-center"
        onClick={() => setOpenDialog(true)}
      >
        {isSubmitting ? (
          <Spinner className="size-6 fill-white"/>
        ) : (
          <>Ban Member</>
        )}
      </button>

      {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.BanMembers) && (
        <DialogForm
          open={openDialog}
          onOpenChange={(open) => {
            if (open) {
              setOpenDialog(true);
            } else {
              setOpenDialog(false);
              reset();
            }
          }}
          headerIcon={(<BsHammer className="size-10 fill-white"/>)}
          title="Ban Member"
          subtitle="The council have decided to exile this nerd"
          contentClassName="centered-dialog rounded-xl text-white bg-gray-650 outline-none w-160"
          formMethods={formMethods}
          submitButton={(
            <button
              type="submit"
              className="button-theme-primary cursor-pointer h-10 rounded-md w-32 flex flex-row justify-center items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner className="size-5 fill-white"/>
              ) : (
                <>Ban Member</>
              )}
            </button>
          )}
          onSubmit={handleSubmit}
        >
          <p>
            Are you sure you want to ban this member?<br/>
            You can unban them later, but the action will be logged in the moderation log.
          </p>

          <Label.Root className="block label mt-2 mb-1">Reason</Label.Root>

          <textarea
            className="input-field h-32 w-full resize-none px-3 py-2"
            placeholder="Enter reason (Optional)"
            {...register("reason")}
          />

          {errors.reason && (
            <ErrorText className="mt-1">{errors.reason.message}</ErrorText>
          )}

          <Label.Root className="block label mt-2 mb-1">Duration</Label.Root>

          <Controller
            control={control}
            name="duration"
            render={({field}) => {
              return (
                <div className="flex flex-row justify-center items-center">
                  <DurationInput
                    value={field.value}
                    onChange={field.onChange}
                    className="w-3/5"
                    presets={[
                      {label: "Infinite", value: { days: 9999999, hours: 23, minutes: 59, seconds: 59 }},
                      {label: "1 year", value: { days: 365, hours: 0, minutes: 0, seconds: 0 }},
                      {label: "1 month", value: { days: 28, hours: 0, minutes: 0, seconds: 0 }},
                      {label: "1 week", value: { days: 7, hours: 0, minutes: 0, seconds: 0 }},
                      {label: "1 day", value: { days: 1, hours: 0, minutes: 0, seconds: 0 }},
                      {label: "1 hour", value: { days: 0, hours: 1, minutes: 0, seconds: 0 }},
                    ]}
                  />
                </div>
              )
            }}
          />

          {errors.duration && (
            <ErrorText className="mt-1 block text-center">{errors.duration.message}</ErrorText>
          )}
        </DialogForm>
      )}
    </>
  );
}

function UnbanMemberButton({
  onUnbanned
}: {onUnbanned: () => void}) {
  const { inspectingMemberInfo } = useContext(InspectingMemberContext)!;
  const { serverId, memberAuthorizeInfo } = useCommunityServerContext();

  const [openDialog, setOpenDialog] = useState(false);

  const unbanMutation = useUnbanServerMemberMutation({
    onSuccess: async () => {
      setOpenDialog(false);
      toast.success("Member has been unbanned.");
      onUnbanned();
    },
    onError: (_err) => {
      toast.error("Failed to unban member.");
    },
  });

  return (
    <>
      <button
        type="button"
        disabled={!memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.BanMembers) || unbanMutation.isPending || !inspectingMemberInfo.banExpireAt}
        className="flex-1 px-4 h-12 text-sm text-white rounded-lg button-theme-success cursor-pointer flex justify-center items-center"
        onClick={() => setOpenDialog(true)}
      >
        {unbanMutation.isPending ? (
          <Spinner className="size-6 fill-white"/>
        ) : (
          <>Unban Member</>
        )}
      </button>

      {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.UnbanMembers) && (
        <Dialog
          open={openDialog}
          onOpenChange={(open) => {
            if (open) {
              setOpenDialog(true);
            } else {
              setOpenDialog(false);
            }
          }}
          title="Unban Member"
          subtitle="Feeling funny today, might unban a guy for a change."
          headerIcon={(<BsHammer className="size-10 fill-white"/>)}
          contentClassName="centered-dialog rounded-xl text-white bg-gray-650 outline-none w-128"
          footerContent={(
            <div className="w-full flex flex-row justify-end p-3 gap-3">
              <RadixDialog.Close
                type="button"
                className="cursor-pointer basis-20 outline-none"
              >
                Cancel
              </RadixDialog.Close>

              <button
                type="submit"
                className="button-theme-primary cursor-pointer h-10 rounded-md w-40 flex flex-row justify-center items-center"
                disabled={unbanMutation.isPending}
                onClick={() => unbanMutation.mutate({ serverId, memberId: inspectingMemberInfo.id })}
              >
                {unbanMutation.isPending ? (
                  <Spinner className="size-5 fill-white"/>
                ) : (
                  <>Unban Member</>
                )}
              </button>
            </div>
          )}
        >
          <div className="px-4 py-2">
            Are you sure you want to unban this member?<br/>
          </div>
        </Dialog>
      )}
    </>
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
  const queryClient = useQueryClient();
  const { serverId, memberAuthorizeInfo } = useCommunityServerContext();
  const [searchValue, setSearchValue] = useDebounceValue("", 500);

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteGetAssignableServerRolesQuery(
    { serverId, nameFilter: searchValue, after: null, authorizeLevel: memberAuthorizeInfo.authorizeLevel },
    {
      initialPageParam: { after: null },
      getNextPageParam: (lastPage) => {
        const pageInfo = lastPage?.communityServerRoles?.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
      staleTime: 30 * 60 * 1000,
    }
  );

  const allElements = data?.pages.flatMap((page) => page?.communityServerRoles?.nodes ?? []) ?? [];

  useSignalREvent("ServerRoleCreated", (event: ServerRoleCreatedEvent) => {
    if (serverId !== event.serverId) return;

    queryClient.invalidateQueries({queryKey: useInfiniteGetAssignableServerRolesQuery.getKey({serverId,authorizeLevel: memberAuthorizeInfo.authorizeLevel})});
  });

  useSignalREvent("ServerRoleUpdated", (event: ServerRoleUpdatedEvent) => {
    if (serverId !== event.serverId) return;

    queryClient.invalidateQueries({queryKey: useInfiniteGetAssignableServerRolesQuery.getKey({serverId,authorizeLevel: memberAuthorizeInfo.authorizeLevel})});
  });

  useSignalREvent("MemberRolesUpdated", (event: MemberRolesUpdatedEvent) => {
    if (event.serverId !== serverId) return;

    queryClient.invalidateQueries({queryKey: useInfiniteGetAssignableServerRolesQuery.getKey({serverId,authorizeLevel: memberAuthorizeInfo.authorizeLevel})});
  });

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
          <div className="px-1 pt-1 flex-none">
            <input
              type="text"
              placeholder="Enter name"
              className="text-sm input-field py-2 px-2"
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <VirtualizedScrollList
            className="flex-1"
            viewportClassName="overflow-y-auto w-full flex items-center justify-center"
            itemCount={allElements.length}
            keyExtractor={(index) => allElements[index].id}
            isLoading={isLoading}
            estimateSize={() => 32}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={() => {
              fetchNextPage();
            }}
            renderSkeletonItem={(index) => (
              <li className="h-8 flex flex-row items-center gap-2 px-1" key={index}>
                <BsCircleFill className="size-2.5 fill-white/10 animate-pulse"/>
                <span className="h-4 w-32 bg-white/10 animate-pulse rounded"></span>
              </li>
            )}
            renderEmpty={() => (
              <div className="flex flex-1 select-none items-center justify-center text-gray-400">
                No assignable role...
              </div>
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