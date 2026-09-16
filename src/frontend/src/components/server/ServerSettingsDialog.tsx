import Dialog from "../Dialog.tsx";
import {Tabs} from "radix-ui";
import {BsGearFill, BsPeopleFill} from "react-icons/bs";
import {useEffect, useRef, useState} from "react";
import {createTimeline} from "animejs";
import {FaClipboardList, FaUserShield} from "react-icons/fa6";
import RoleManagement from "./RoleManagement.tsx";
import MemberManagement from "./MemberManagement.tsx";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import ModerationLog from "./ModerationLog.tsx";
import {ServerPermission} from "../../graphql/types.ts";

export function ServerSettingsDialog({open, onOpenChanged}: {open: boolean, onOpenChanged: (open: boolean) => void}) {
  const { memberAuthorizeInfo } = useCommunityServerContext();

  const [activeTab, setActiveTab] = useState<string>("");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChanged}
      headerIcon={(
        <AnimatedGearIcon/>
      )}
      title="Server Configuration Panel"
      subtitle="Click-clack, what is that sound?"
      contentClassName="centered-dialog size-full rounded-xl text-white bg-gray-650 outline-none"
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-row overflow-hidden size-full"
        orientation="vertical"
      >
        <Tabs.List className="flex-none basis-14 border-r-2 border-r-gray-600 flex flex-col items-center py-2 gap-1">
          <Tabs.Trigger value="roles" className={`hover-highlight outline-none p-1 rounded-md cursor-pointer data-[state=active]:bg-white/8`}>
            <FaUserShield className="size-8 fill-slate-200"/>
          </Tabs.Trigger>

          {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.ManageMembers) && (
            <Tabs.Trigger value="members" className={`hover-highlight outline-none p-1 rounded-md cursor-pointer data-[state=active]:bg-white/8`}>
              <BsPeopleFill className="size-8 fill-slate-200"/>
            </Tabs.Trigger>
          )}

          {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.ReadModerationLogs) && (
            <Tabs.Trigger value="modlogs" className={`hover-highlight outline-none p-1 rounded-md cursor-pointer data-[state=active]:bg-white/8`}>
              <FaClipboardList className="size-8 fill-slate-200"/>
            </Tabs.Trigger>
          )}
        </Tabs.List>

        {!activeTab && (
          <div className="flex-1 flex flex-col justify-center items-center">
            <p className="font-medium text-gray-400 select-none">No section selected</p>
            <p className="text-sm text-gray-400 select-none">Click a tab to view details.</p>
          </div>
        )}

        <Tabs.Content value="roles" className="p-2 flex-1 overflow-hidden relative flex flex-col gap-2">
          <RoleManagement/>
        </Tabs.Content>

        {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.ManageMembers) && (
          <Tabs.Content value="members" className="p-2 flex-1 overflow-y-auto relative flex flex-col gap-2">
            <MemberManagement/>
          </Tabs.Content>
        )}

        {memberAuthorizeInfo.effectivePermissions.includes(ServerPermission.ReadModerationLogs) && (
          <Tabs.Content value="modlogs" className="p-2 flex-1 overflow-y-auto relative flex flex-col gap-2">
            <ModerationLog/>
          </Tabs.Content>
        )}
      </Tabs.Root>
    </Dialog>
  );
}

function AnimatedGearIcon() {
  const gearIcon = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gearIcon.current) return;

    const timeline = createTimeline({
      loop: true,
    });

    timeline.add(gearIcon.current, {
      rotate: '+=45deg',
      duration: 500,
      delay: 1000,
      ease: 'inOutBack(2.5)',
    });

    return () => {
      timeline.pause();
    };
  }, []);

  return (
    <div ref={gearIcon}>
      {<BsGearFill className="size-10 fill-white"/>}
    </div>
  );
}