import {Outlet, useNavigate, useParams} from "react-router";
import {communityServerService} from "../../api/communityServerService.ts";
import Spinner from "../../components/Spinner.tsx";
import type {ServerDetailDto} from "../../api/types.ts";
import CommunityServerContextProvider from "../../contexts/CommunityServerContext.tsx";
import ServerSidebar from "../../components/server/ServerSidebar.tsx";
import {type QueryKey, useQuery, useQueryClient} from "@tanstack/react-query";
import {ChannelType} from "../../api/schema.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {MemberRolesUpdatedEvent, ServerRoleDeletedEvent, ServerRoleUpdatedEvent} from "../../api/events.ts";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import Dialog from "../../components/Dialog.tsx";
import {useEffect, useState} from "react";
import {BsHammer} from "react-icons/bs";
import {toast} from "react-toastify";
import useServerMemberAuthorizeInfo, {
  type ServerMemberAuthorizeInfo
} from "../../hooks/useServerMemberAuthorizeInfo.tsx";

export default function ServerLayout() {
  // TODO: Fix: When user is kicked, they can still enter server via the URL.

  const navigate = useNavigate();

  const { userAuthorization } = useAuthorization();
  const { serverId } = useParams();

  const serverSummaryQueryKey: QueryKey = ["getServerSummary", serverId];

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
    isLoading: isLoadingMemberPermissions,
    isError: isLoadingMemberPermissionsError,
    authorizeInfo,
  } = useServerMemberAuthorizeInfo({
    serverId: serverId!,
    userId: userAuthorization?.id!,
    enabled: !!serverId && !!userAuthorization?.id,
  });

  useEffect(() => {
    console.log("isLoadingMemberPermissions changed:", isLoadingMemberPermissions);
  }, [isLoadingMemberPermissions]);

  const [showKickedDialog, setShowKickedDialog] = useState(false);

  useSignalREvent(["ServerRoleUpdated", "ServerRoleDeleted"], (event: ServerRoleUpdatedEvent | ServerRoleDeletedEvent) => {
    if (serverId !== event.serverId) return;
    if (!authorizeInfo) return;

    if (!authorizeInfo.roleIds.includes(event.roleId)) return;

    authorizeInfo.refreshPermissions();
  });

  useSignalREvent("MemberRolesUpdated", (event: MemberRolesUpdatedEvent) => {
    if (event.serverId !== serverId) return;
    if (!authorizeInfo) return;
    if (event.memberUserId !== userAuthorization?.id) return;

    authorizeInfo.refreshPermissions();
  });

  useSignalREvent("KickedFromServer", (kickedServerId: string) => {
    if (serverId !== kickedServerId) {
      return;
    }

    setShowKickedDialog(true);

    if (authorizeInfo) {
      authorizeInfo.refreshPermissions();
    }
  });

  useSignalREvent("BannedFromServer", (bannedServerId: string) => {
    if (serverId !== bannedServerId) {
      return;
    }

    if (authorizeInfo) {
      authorizeInfo.refreshPermissions();
    }

    toast.info("You have been banned from this server. You can still access some content authorized by the moderation team, but interaction has been restricted to minimum.");
  });

  if (isLoadingServerSummary || isLoadingMemberPermissions) {
    return (
      <div className="size-full flex flex-row justify-center items-center">
        <Spinner className="size-8 fill-white"/>
      </div>
    );
  }

  if (isLoadingServerSummaryError || isLoadingMemberPermissionsError || !serverSummary || !authorizeInfo) {
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
        memberAuthorizeInfo={authorizeInfo}
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
  memberAuthorizeInfo: ServerMemberAuthorizeInfo;
}

function SuccessfullyLoadedLayout({
  serverId,
  serverSummary,
  serverSummaryQueryKey,
  memberAuthorizeInfo,
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

  return (
    <CommunityServerContextProvider
      serverId={serverId}
      serverSummary={serverSummary}
      appendChannelCategory={appendChannelCategory}
      appendChannel={appendChannel}
      removeChannelCategory={removeChannelCategory}
      removeChannel={removeChannel}
      memberAuthorizeInfo={memberAuthorizeInfo}
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