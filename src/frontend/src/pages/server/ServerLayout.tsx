import { Outlet, useNavigate, useParams } from "react-router";
import Spinner from "../../components/Spinner.tsx";
import CommunityServerContextProvider, {
  useCommunityServerContext,
} from "../../contexts/CommunityServerContext.tsx";
import { BsExclamationTriangle } from "react-icons/bs";
import SidebarContent from "../../components/server/SidebarContent.tsx";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import KickedFromServerDialog from "../../components/server/KickedFromServerDialog.tsx";
import { useState } from "react";
import { toast } from "react-toastify";
import type {
  LeftServerEvent,
  MemberRolesUpdatedEvent,
  ServerDefaultRoleUpdatedEvent,
  ServerRoleDeletedEvent,
  ServerRoleUpdatedEvent,
} from "../../api/events.ts";

export default function ServerLayout() {
  const { serverId } = useParams();

  return (
    <CommunityServerContextProvider serverId={serverId}>
      <EnableGuard />
    </CommunityServerContextProvider>
  );
}

function EnableGuard() {
  const {
    detailsQueryResult: { isEnabled },
  } = useCommunityServerContext();

  if (!isEnabled) {
    return (
      <div className="flex size-full flex-row items-center justify-center">
        <span className="text-gray-400 select-none">
          Well there is nothing here... Whatever you are trying to find here might have been lost to time.
        </span>
      </div>
    );
  }

  return <PageContent />;
}

function PageContent() {
  return (
    <div className="flex size-full flex-row text-white">
      <aside className="bg-gray-725 h-full w-64 flex-none overflow-hidden border-r-2 border-r-gray-600">
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-row items-center justify-center overflow-auto">
        <PageOutlet />
      </div>
    </div>
  );
}

function PageOutlet() {
  const {
    detailsQueryResult: { isLoading, isError },
  } = useCommunityServerContext();

  return (
    <>
      {isLoading ? (
        <div className="flex size-full flex-row items-center justify-center">
          <Spinner className="size-10 fill-white" />
        </div>
      ) : isError ? (
        <div className="flex size-full flex-col items-center justify-center gap-2">
          <BsExclamationTriangle className="size-10 fill-white" />
          <span className="text-sm text-gray-400 select-none">
            You are not supposed to be here, unless something went wrong. Very wrong...
          </span>
        </div>
      ) : (
        <SuccessfullyLoaded />
      )}
    </>
  );
}

function SuccessfullyLoaded() {
  const {
    detailsQueryResult: { data: serverDetails },
    updatePermission,
    refreshPermission,
  } = useCommunityServerContext();
  const [showKickedDialog, setShowKickedDialog] = useState(false);
  const navigate = useNavigate();

  useSignalREvent("MemberRolesUpdated", async (event: MemberRolesUpdatedEvent) => {
    if (event.serverId !== serverDetails?.id) return;
    if (event.memberUserId !== serverDetails.authorizeInfo.memberId) return;

    await refreshPermission();
  });

  useSignalREvent("ServerDefaultRoleUpdated", async (event: ServerDefaultRoleUpdatedEvent) => {
    if (serverDetails?.id !== event.serverId) return;

    await refreshPermission();
  });

  useSignalREvent(
    ["ServerRoleUpdated", "ServerRoleDeleted"],
    async (event: ServerRoleUpdatedEvent | ServerRoleDeletedEvent) => {
      if (serverDetails?.id !== event.serverId) return;
      if (!serverDetails.authorizeInfo.roles.some((r) => r.id === event.roleId)) return;

      await refreshPermission();
    },
  );

  useSignalREvent("LeftServer", (event: LeftServerEvent) => {
    if (serverDetails?.id === event.serverId) {
      navigate("/lobby");
    }
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
      <Outlet />
      <KickedFromServerDialog open={showKickedDialog} onOpenChange={setShowKickedDialog} />
    </>
  );
}
