import Dialog from "../Dialog.tsx";
import { Tabs } from "radix-ui";
import { BsPeopleFill, BsEmojiSmileFill } from "react-icons/bs";
import { useEffect, useState } from "react";
import { FaClipboardList, FaUserShield } from "react-icons/fa6";
import RoleManagement from "./RoleManagement.tsx";
import MemberManagement from "./MemberManagement.tsx";
import { useCommunityServerContext } from "../../contexts/CommunityServerContext.tsx";
import ModerationLog from "./ModerationLog.tsx";
import { ServerPermission } from "../../graphql/types.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteGetServerModerationLogsQuery } from "../../graphql/infiniteQueries.ts";
import AnimatedGearIcon from "../AnimatedGearIcon.tsx";
import {
  UnsavedChangesProvider,
  useUnsavedChanges,
} from "../../contexts/UnsavedChangesContext.tsx";
import EmojiManagement from "./EmojiManagement.tsx";

export function ServerManagementModal({
  open,
  onOpenChanged,
}: {
  open: boolean;
  onOpenChanged: (open: boolean) => void;
}) {
  return (
    <UnsavedChangesProvider>
      <Modal open={open} onOpenChanged={onOpenChanged} />
    </UnsavedChangesProvider>
  );
}

function Modal({
  open,
  onOpenChanged,
}: {
  open: boolean;
  onOpenChanged: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const {
    detailsQueryResult: { data: serverDetails },
    hasPermission,
  } = useCommunityServerContext();
  const [activeTab, setActiveTab] = useState<string>("");
  const [shaking, setShaking] = useState(false);

  const { guard, setDirty } = useUnsavedChanges();

  // fresh tab, so mark non-dirty
  useEffect(() => {
    setDirty(false);
  }, [activeTab, setDirty]);

  // invalidate the moderation log query when there is update event
  useSignalREvent("UpdateModerationLog", () => {
    if (!serverDetails || !hasPermission(ServerPermission.ReadModerationLogs))
      return;

    queryClient.invalidateQueries({
      queryKey: useInfiniteGetServerModerationLogsQuery.getKey({
        serverId: serverDetails.id,
        after: null,
      }),
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChanged}
      headerIcon={<AnimatedGearIcon className="size-10 fill-white" />}
      title="Server Configuration Panel"
      subtitle="Click-clack, what is that sound?"
      contentClassName="fullscreen-dialog text-white bg-gray-650 outline-none"
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={guard(setActiveTab)}
        activationMode="manual"
        className="flex size-full flex-1 flex-row overflow-hidden"
        orientation="vertical"
      >
        <Tabs.List className="flex flex-none basis-14 flex-col items-center gap-1 border-r-2 border-r-gray-600 py-2">
          <Tabs.Trigger
            value="roles"
            className={`hover-highlight cursor-pointer rounded-md p-1 outline-none data-[state=active]:bg-white/8`}
          >
            <FaUserShield className="size-8 fill-slate-200" />
          </Tabs.Trigger>

          {hasPermission(ServerPermission.ManageMembers) && (
            <Tabs.Trigger
              value="members"
              className={`hover-highlight cursor-pointer rounded-md p-1 outline-none data-[state=active]:bg-white/8`}
            >
              <BsPeopleFill className="size-8 fill-slate-200" />
            </Tabs.Trigger>
          )}

          {hasPermission(ServerPermission.ReadModerationLogs) && (
            <Tabs.Trigger
              value="modlogs"
              className={`hover-highlight cursor-pointer rounded-md p-1 outline-none data-[state=active]:bg-white/8`}
            >
              <FaClipboardList className="size-8 fill-slate-200" />
            </Tabs.Trigger>
          )}

          <Tabs.Trigger
            value="emoji"
            className={`hover-highlight cursor-pointer rounded-md p-1 outline-none data-[state=active]:bg-white/8`}
          >
            <BsEmojiSmileFill className="size-8 fill-slate-200" />
          </Tabs.Trigger>
        </Tabs.List>

        <div
          className={`flex flex-1 flex-col overflow-hidden ${shaking ? "animate-horizontalShake" : ""}`}
          onAnimationEnd={() => setShaking(false)}
        >
          {!activeTab && (
            <div className="flex flex-1 flex-col items-center justify-center">
              <p className="font-medium text-gray-400 select-none">
                No section selected
              </p>
              <p className="text-sm text-gray-400 select-none">
                Click a tab to view details.
              </p>
            </div>
          )}

          <Tabs.Content
            value="roles"
            className="relative flex flex-1 flex-col gap-2 overflow-hidden p-2"
          >
            <RoleManagement />
          </Tabs.Content>

          {hasPermission(ServerPermission.ManageMembers) && (
            <Tabs.Content
              value="members"
              className="relative flex flex-1 flex-col gap-2 overflow-y-auto p-2"
            >
              <MemberManagement />
            </Tabs.Content>
          )}

          {hasPermission(ServerPermission.ReadModerationLogs) && (
            <Tabs.Content
              value="modlogs"
              className="relative flex flex-1 flex-col gap-2 overflow-y-auto p-2"
            >
              <ModerationLog />
            </Tabs.Content>
          )}

          {hasPermission(ServerPermission.ManageEmojis) && (
            <Tabs.Content
              value="emoji"
              className="relative flex flex-1 flex-col gap-2 overflow-hidden p-2"
            >
              <EmojiManagement />
            </Tabs.Content>
          )}
        </div>
      </Tabs.Root>
    </Dialog>
  );
}
