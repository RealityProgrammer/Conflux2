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
  const [showKickedDialog, setShowKickedDialog] = useState(false);

  useSignalREvent("MemberRolesUpdated", async (event: MemberRolesUpdatedEvent) => {
    if (event.serverId !== serverDetails?.id) return;
    if (event.memberUserId !== serverDetails.authorizeInfo.memberId) return;

    await refreshPermission();
  });

  useSignalREvent("ServerDefaultRoleUpdated", async (event: ServerDefaultRoleUpdatedEvent) => {
    if (serverDetails?.id !== event.serverId) return;

    await refreshPermission();
  });

  useSignalREvent(["ServerRoleUpdated", "ServerRoleDeleted"], async (event: ServerRoleUpdatedEvent | ServerRoleDeletedEvent) => {
    console.log("ServerRoleUpdated");

    if (serverDetails?.id !== event.serverId) return;
    if (!serverDetails.authorizeInfo.roles.some(r => r.id === event.roleId)) return;

    await refreshPermission();
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