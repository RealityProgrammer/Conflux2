import Dialog from "../Dialog.tsx";
import {Tabs} from "radix-ui";
import {BsGearFill, BsPeopleFill} from "react-icons/bs";
import {useEffect, useRef} from "react";
import {createTimeline} from "animejs";
import {FaUserShield} from "react-icons/fa6";
import RoleManagement from "./RoleManagement.tsx";

export function ServerSettingsDialog({open, onOpenChanged}: {open: boolean, onOpenChanged: (open: boolean) => void}) {
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
      <Tabs.Root className="flex-1 flex flex-row overflow-hidden size-full" orientation="vertical">
        <Tabs.List className="flex-none basis-14 border-r-2 border-r-gray-600 flex flex-col items-center py-2 gap-1">
          <Tabs.Trigger value="roles" className={`hover-highlight outline-none p-1 rounded-md cursor-pointer data-[state=active]:bg-white/8`}>
            <FaUserShield className="size-8 fill-slate-200"/>
          </Tabs.Trigger>

          <Tabs.Trigger value="members" className={`hover-highlight outline-none p-1 rounded-md cursor-pointer data-[state=active]:bg-white/8`}>
            <BsPeopleFill className="size-8 fill-slate-200"/>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="roles" className="p-2 flex-1 overflow-y-auto relative flex flex-col gap-2">
          <RoleManagement/>
        </Tabs.Content>

        <Tabs.Content value="members" className="p-2 flex-1 overflow-hidden relative">
          <p>Members</p>
        </Tabs.Content>
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