import {Outlet, useNavigate, useParams} from "react-router";
import {communityServerService} from "../../api/communityServerService.ts";
import Spinner from "../../components/Spinner.tsx";
import type {ServerDetailDto, ServerMemberAuthorizationInfoDto} from "../../api/types.ts";
import CommunityServerContextProvider from "../../contexts/CommunityServerContext.tsx";
import ServerSidebar from "../../components/server/ServerSidebar.tsx";
import {type QueryKey, useQuery, useQueryClient} from "@tanstack/react-query";
import {ChannelType} from "../../api/schema.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {MemberRolesUpdatedEvent, ServerRoleDeletedEvent, ServerRoleUpdatedEvent} from "../../api/events.ts";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import Dialog from "../../components/Dialog.tsx";
import {useState} from "react";
import {BsHammer} from "react-icons/bs";

export default function ServerLayout() {
  const navigate = useNavigate();

  const { userAuthorization } = useAuthorization();
  const { serverId } = useParams();

  const queryClient = useQueryClient();

  const serverSummaryQueryKey: QueryKey = ["getServerSummary", serverId];
  const userMemberPermissionQueryKey: QueryKey = ["getSessionUserMemberServerPermissions", serverId];

  const {
    data: serverSummary,
    isLoading: isLoadingServerSummary,
    isError: isLoadingServerSummaryError,
  } = useQuery({
    enabled: !!serverId,
    queryKey: serverSummaryQueryKey,
    queryFn: async () => {
      return (await communityServerService.getSummary(serverId!)).data;
    },
    staleTime: 15 * 60 * 1000,
  });

  const {
    data: memberPermissions,
    isLoading: isLoadingUserPermissions,
    isError: isLoadingUserPermissionsError,
  } = useQuery<ServerMemberAuthorizationInfoDto | null | undefined>({
    enabled: !!serverId,
    queryKey: userMemberPermissionQueryKey,
    queryFn: async (): Promise<ServerMemberAuthorizationInfoDto | null | undefined> => {
      const response = await communityServerService.getUserPermission(serverId!);

      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const [showKickedDialog, setShowKickedDialog] = useState(false);

  useSignalREvent("ServerRoleUpdated", (event: ServerRoleUpdatedEvent) => {
    if (serverId !== event.serverId) return;

    queryClient.invalidateQueries({queryKey: userMemberPermissionQueryKey});
  });

  useSignalREvent("ServerRoleDeleted", (event: ServerRoleDeletedEvent) => {
    if (serverId !== event.serverId) return;
    if (!memberPermissions?.roles.map(r => r.id).includes(event.roleId)) return;

    queryClient.invalidateQueries({queryKey: userMemberPermissionQueryKey});
  });

  useSignalREvent("MemberRolesUpdated", (event: MemberRolesUpdatedEvent) => {
    if (event.serverId !== serverId) return;
    if (event.memberUserId !== userAuthorization?.id) return;

    queryClient.invalidateQueries({queryKey: userMemberPermissionQueryKey});
  });

  useSignalREvent("KickedFromServer", (serverId: string) => {
    setShowKickedDialog(true);
  });

  if (isLoadingServerSummary || isLoadingUserPermissions) {
    return (
      <div className="size-full flex flex-row justify-center items-center">
        <Spinner className="size-8 fill-white"/>
      </div>
    );
  }

  if (isLoadingServerSummaryError || isLoadingUserPermissionsError || !serverSummary || !memberPermissions) {
    return (
      <div className="size-full flex flex-row justify-center items-center">
        <span className="text-white">Failed to load some information. Please try again later...</span>
      </div>
    );
  }

  return (
    <>
      <SuccessfullyLoadedLayout
        serverId={serverId!}
        serverSummary={serverSummary}
        serverSummaryQueryKey={serverSummaryQueryKey}
        memberPermissions={memberPermissions}
        userMemberPermissionQueryKey={userMemberPermissionQueryKey}
      />

      <Dialog
        open={showKickedDialog}
        onOpenChange={(open) => {
          if (open) {
            setShowKickedDialog(true);
          } else {
            setShowKickedDialog(false);
            navigate("/lobby/me", {
              replace: true,
            });
          }
        }}
        headerIcon={(
          <BsHammer className="size-10 fill-white"/>
        )}
        title="Kicked from server"
        subtitle="You have been banished by the council"
        contentClassName="centered-dialog rounded-xl text-white bg-gray-650 outline-none w-lg"
        disableCloseOnOutsideClick
        disableCloseOnEscapeKeyDown
      >
        <div className="px-4 py-3">
          You've been kicked from the server.<br/>

          But don't worry, you can rejoin if you have an active invitation.
        </div>
      </Dialog>
    </>
  );
}

interface SuccessfullyLoadedLayoutProps {
  serverId: string;
  serverSummary: ServerDetailDto;
  serverSummaryQueryKey: QueryKey
  memberPermissions: ServerMemberAuthorizationInfoDto;
  userMemberPermissionQueryKey: QueryKey
}

function SuccessfullyLoadedLayout({
  serverId,
  serverSummary,
  serverSummaryQueryKey,
  memberPermissions,
  userMemberPermissionQueryKey,
}: SuccessfullyLoadedLayoutProps) {
  const queryClient = useQueryClient();

  const appendChannelCategory = (id: string, name: string) => {
    queryClient.setQueryData<ServerDetailDto>(serverSummaryQueryKey, (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        channelCategories: [
          ...oldData.channelCategories,
          {
            id,
            name,
            channels: [],
          }
        ]
      }
    });
  };

  const appendChannel = (
    id: string,
    name: string,
    type: "text" | "voice",
    categoryId: string | null
  ) => {
    queryClient.setQueryData<ServerDetailDto>(serverSummaryQueryKey, (oldData: NoInfer<ServerDetailDto> | undefined): ServerDetailDto | undefined => {
      if (!oldData) return oldData;

      if (!oldData.channelCategories || oldData.channelCategories.length === 0) {
        return {
          ...oldData,
          channelCategories: [
            {
              id: null,
              name: null,
              channels: [
                {
                  id,
                  name,
                  channelType: type === "text" ? ChannelType.CommunityServerText : ChannelType.CommunityServerVoice,
                  categoryId,
                }
              ]
            }
          ]
        };
      }

      return {
        ...oldData,
        channelCategories: oldData.channelCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              channels: [
                ...category.channels,
                {
                  id,
                  name,
                  channelType: type === "text" ? ChannelType.CommunityServerText : ChannelType.CommunityServerVoice,
                  categoryId,
                },
              ],
            };
          }

          return category;
        }),
      };
    });
  };

  const removeChannelCategory = (id: string) => {
    queryClient.setQueryData<ServerDetailDto>(serverSummaryQueryKey, (oldData) => {
      if (!oldData) return oldData;

      const removingCategory = oldData.channelCategories.find(c => c.id === id);

      if (!removingCategory) {
        return oldData;
      }

      let updatedChannelCategories = oldData.channelCategories.filter(c => c.id !== id);
      const nullCategoryExists = updatedChannelCategories.some((c) => c.id == null);

      // if there is a category with null id, append the channels to it, else create a category with null id
      if (nullCategoryExists) {
        updatedChannelCategories = updatedChannelCategories.map((c) => {
          if (c.id == null) {
            return {
              ...c,
              channels: [...c.channels, ...removingCategory.channels],
            };
          }
          return c;
        });
      } else {
        updatedChannelCategories.push({
          id: null,
          name: null,
          channels: removingCategory.channels,
        });
      }

      return {
        ...oldData,
        channelCategories: updatedChannelCategories,
      };
    });
  };

  const removeChannel = (id: string) => {
    queryClient.setQueryData<ServerDetailDto>(serverSummaryQueryKey, (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        channelCategories: oldData.channelCategories.map(category => {
          const channelIndex = category.channels.findIndex((c) => c.id === id);

          if (channelIndex === -1) {
            return category;
          }

          const updatedChannels = [
            ...category.channels.slice(0, channelIndex),
            ...category.channels.slice(channelIndex + 1)
          ];

          return {
            ...category,
            channels: updatedChannels,
          }
        }),
      }
    });
  };

  const updateMemberPermissions = (update: Partial<Omit<ServerMemberAuthorizationInfoDto, "memberId">>) => {
    queryClient.setQueryData<ServerMemberAuthorizationInfoDto>(userMemberPermissionQueryKey, (oldData) => {
      if (!oldData) return oldData;

      return {...oldData, ...update};
    });
  }

  return (
    <CommunityServerContextProvider
      serverId={serverId}
      serverSummary={serverSummary}
      appendChannelCategory={appendChannelCategory}
      appendChannel={appendChannel}
      removeChannelCategory={removeChannelCategory}
      removeChannel={removeChannel}
      memberPermissions={memberPermissions}
      updateMemberPermissions={updateMemberPermissions}
    >
      <div className="size-full flex flex-row">
        <ServerSidebar/>

        <div className="flex-1 overflow-auto flex flex-row justify-center items-center">
          <Outlet/>
        </div>
      </div>
    </CommunityServerContextProvider>
  );
}