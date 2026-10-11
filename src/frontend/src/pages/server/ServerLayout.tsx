import {Outlet, useParams} from "react-router";
import Spinner from "../../components/Spinner.tsx";
import CommunityServerContextProvider, {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {BsExclamationTriangle} from "react-icons/bs";
import SidebarContent from "../../components/server/SidebarContent.tsx";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import KickedFromServerDialog from "../../components/server/KickedFromServerDialog.tsx";
import {useState} from "react";
import {toast} from "react-toastify";
import type {
  MemberRolesUpdatedEvent,
  ServerDefaultRoleUpdatedEvent,
  ServerRoleDeletedEvent,
  ServerRoleUpdatedEvent
} from "../../api/events.ts";
import {useSignalR} from "../../contexts/SignalRContext.tsx";

export default function ServerLayout() {
  const { serverId } = useParams();
  
  return (
    <CommunityServerContextProvider 
      serverId={serverId}
    >
      <EnableGuard/>
    </CommunityServerContextProvider>
  );
}

function EnableGuard() {
  const { detailsQueryResult: { isEnabled } } = useCommunityServerContext();
  
  if (!isEnabled) {
    return (
      <div className="size-full flex flex-row justify-center items-center">
        <span className="select-none text-gray-400">
          Well there is nothing here... Whatever you are trying to find here might have been lost to time.
        </span>
      </div>
    );
  }
  
  return (
    <div className="size-full flex flex-row text-white">
      <aside className="flex-none w-64 h-full bg-gray-725 border-r-2 border-r-gray-600 overflow-hidden">
        <SidebarContent/>
      </aside>
      
      <div className="flex-1 overflow-auto flex flex-row justify-center items-center">
        <PageOutlet/>
      </div>
    </div>
  );
}

function PageOutlet() {
  const { detailsQueryResult: { isLoading, isError } } = useCommunityServerContext();
  
  return (
    <>
      {isLoading ? (
        <div className="size-full flex flex-row justify-center items-center">
          <Spinner className="size-10 fill-white"/>
        </div>
      ) : isError ? (
        <div className="size-full flex flex-col gap-2 justify-center items-center">
          <BsExclamationTriangle className="size-10 fill-white"/>
          <span className="text-gray-400 select-none text-sm">
            You are not supposed to be here, unless something went wrong. Very wrong...
          </span>
        </div>
      ) : (
        <SuccessfullyLoaded/>
      )}
    </>
  );
}

function SuccessfullyLoaded() {
  const { detailsQueryResult: { data: serverDetails }, updatePermission, refreshPermission } = useCommunityServerContext();
  const { invokeSafely } = useSignalR();
  const [showKickedDialog, setShowKickedDialog] = useState(false);
  
  // invokes leave server and rejoin so that backend can correctly track connection joined groups
  const refreshPermissionWithGroup = async () => {
    await invokeSafely("LeaveServer", serverDetails!.id);
    await invokeSafely("JoinServer", serverDetails!.id);

    await refreshPermission();
  }

  useSignalREvent("MemberRolesUpdated", async (event: MemberRolesUpdatedEvent) => {
    console.log("member roles updated");
    
    if (event.serverId !== serverDetails?.id) return;
    if (event.memberUserId !== serverDetails.authorizeInfo.memberId) return;

    await refreshPermissionWithGroup();
  });

  useSignalREvent("ServerDefaultRoleUpdated", async (event: ServerDefaultRoleUpdatedEvent) => {
    if (serverDetails?.id !== event.serverId) return;

    await refreshPermissionWithGroup();
  });

  useSignalREvent(["ServerRoleUpdated", "ServerRoleDeleted"], async (event: ServerRoleUpdatedEvent | ServerRoleDeletedEvent) => {
    if (serverDetails?.id !== event.serverId) return;
    if (!serverDetails.authorizeInfo.roles.some(r => r.id === event.roleId)) return;

    await refreshPermissionWithGroup();
  });
  
  useSignalREvent("KickedFromServer", (kickedServerId: string) => {
    if (kickedServerId !== serverDetails?.id) {
      return;
    }
    
    setShowKickedDialog(true);
    updatePermission({
      authorizeLevel: -1,
      roles: [],
      effectivePermissions: [],
    });
  });

  useSignalREvent("BannedFromServer", (bannedServerId: string) => {
    if (bannedServerId !== serverDetails?.id) {
      return;
    }

    updatePermission({
      authorizeLevel: -1,
      roles: [],
      effectivePermissions: [],
      isBanned: true,
    });

    toast.info("You have been banned from this server.");
  });

  useSignalREvent("UnbannedFromServer", (unbannedServerId: string) => {
    if (unbannedServerId !== serverDetails?.id) {
      return;
    }

    refreshPermission();
    toast.info("You have been unbanned on this server.");
  });

  return (
    <>
      <Outlet/>
      <KickedFromServerDialog open={showKickedDialog} onOpenChange={setShowKickedDialog}/>
    </>
  );
}

// export default function ServerLayout() {
//   const navigate = useNavigate();
//
//   const { userAuthorization } = useAuth();
//   const { serverId } = useParams();
//
//   const serverSummaryQueryKey: QueryKey = ["serverDetails", serverId];
//
//   const {
//     data: serverSummary,
//     isLoading: isLoadingServerSummary,
//     isError: isLoadingServerSummaryError,
//   } = useQuery({
//     enabled: !!serverId,
//     queryKey: serverSummaryQueryKey,
//     queryFn: async () => {
//       return (await communityServerService.getDetails(serverId!)).data;
//     },
//     staleTime: 15 * 60 * 1000,
//   });
//
//   const {
//     isLoading: isLoadingMemberPermissions,
//     isError: isLoadingMemberPermissionsError,
//     authorizeInfo,
//   } = useServerMemberAuthorizeInfo({
//     serverId: serverId!,
//     userId: userAuthorization?.id!,
//     enabled: !!serverId && !!userAuthorization?.id,
//   });
//
//   const [showKickedDialog, setShowKickedDialog] = useState(false);
//
//   useSignalREvent(["ServerRoleUpdated", "ServerRoleDeleted"], (event: ServerRoleUpdatedEvent | ServerRoleDeletedEvent) => {
//     if (serverId !== event.serverId) return;
//     if (!authorizeInfo) return;
//
//     if (!authorizeInfo.roleIds.includes(event.roleId)) return;
//
//     authorizeInfo.refreshPermissions();
//   });
//
//   const { connection: signalrConnection, isConnected: isSignalRConnection, invokeSafely } = useSignalR();
//
//   useSignalREvent("MemberRolesUpdated", async (event: MemberRolesUpdatedEvent) => {
//     if (event.serverId !== serverId) return;
//     if (!authorizeInfo) return;
//     if (event.memberUserId !== userAuthorization?.id) return;
//
//     // invokes leave server and rejoin so that backend can correctly track connection joined groups
//     if (isSignalRConnection && signalrConnection) {
//       await invokeSafely("LeaveServer", serverId);
//       await invokeSafely("JoinServer", serverId);
//     }
//
//     await authorizeInfo.refreshPermissions();
//   });
//
//   useSignalREvent("KickedFromServer", (kickedServerId: string) => {
//     if (serverId !== kickedServerId) {
//       return;
//     }
//
//     setShowKickedDialog(true);
//
//     if (authorizeInfo) {
//       authorizeInfo.refreshPermissions();
//     }
//   });
//
//   useSignalREvent("BannedFromServer", (bannedServerId: string) => {
//     if (serverId !== bannedServerId) {
//       return;
//     }
//
//     if (authorizeInfo) {
//       authorizeInfo.refreshPermissions();
//     }
//
//     toast.info("You have been banned from this server. You can still access some content authorized by the moderation team, but interaction has been restricted to minimum.");
//   });
//
//   useSignalREvent("UnbannedFromServer", (unbannedServerId: string) => {
//     if (serverId !== unbannedServerId) {
//       return;
//     }
//
//     if (authorizeInfo) {
//       authorizeInfo.refreshPermissions();
//     }
//
//     toast.info("You have been unbanned on this server.");
//   });
//
//   if (isLoadingServerSummary || isLoadingMemberPermissions) {
//     return (
//       <div className="size-full flex flex-row justify-center items-center">
//         <Spinner className="size-8 fill-white"/>
//       </div>
//     );
//   }
//
//   if (isLoadingServerSummaryError || isLoadingMemberPermissionsError || !serverSummary || !authorizeInfo) {
//     return (
//       <div className="size-full flex flex-row justify-center items-center">
//         <span className="text-white">Failed to load some information. Please try again later...</span>
//       </div>
//     );
//   }
//
//   return (
//     <>
//       <SuccessfullyLoadedLayout
//         serverId={serverId!}
//         serverSummary={serverSummary}
//         serverSummaryQueryKey={serverSummaryQueryKey}
//         memberAuthorizeInfo={authorizeInfo}
//       />
//
//       <Dialog
//         open={showKickedDialog}
//         onOpenChange={(open) => {
//           if (open) {
//             setShowKickedDialog(true);
//           } else {
//             setShowKickedDialog(false);
//             navigate("/lobby/me", {
//               replace: true,
//             });
//           }
//         }}
//         headerIcon={(
//           <BsHammer className="size-10 fill-white"/>
//         )}
//         title="Kicked from server"
//         subtitle="You have been banished by the council"
//         contentClassName="centered-dialog rounded-xl text-white bg-gray-650 outline-none w-lg"
//         disableCloseOnOutsideClick
//         disableCloseOnEscapeKeyDown
//       >
//         <div className="px-4 py-3">
//           You've been kicked from the server.<br/>
//
//           But don't worry, you can rejoin if you have an active invitation.
//         </div>
//       </Dialog>
//     </>
//   );
// }
//
// interface SuccessfullyLoadedLayoutProps {
//   serverId: string;
//   serverSummary: ServerDetailsDto;
//   serverSummaryQueryKey: QueryKey
//   memberAuthorizeInfo: ServerMemberAuthorizeInfo;
// }
//
// function SuccessfullyLoadedLayout({
//   serverId,
//   serverSummary,
//   serverSummaryQueryKey,
//   memberAuthorizeInfo,
// }: SuccessfullyLoadedLayoutProps) {
//   const queryClient = useQueryClient();
//
//   return (
//     <CommunityServerContextProvider
//       serverId={serverId}
//       detailsQueryResult={serverSummary}
//       appendChannelCategory={appendChannelCategory}
//       removeChannelCategory={removeChannelCategory}
//       removeChannel={removeChannel}
//       invalidateSummary={invalidateSummary}
//       memberAuthorizeInfo={memberAuthorizeInfo}
//     >
//       <div className="size-full flex flex-row">
//         <ServerSidebar/>
//
//         <div className="flex-1 overflow-auto flex flex-row justify-center items-center">
//           <Outlet/>
//         </div>
//       </div>
//     </CommunityServerContextProvider>
//   );
// }