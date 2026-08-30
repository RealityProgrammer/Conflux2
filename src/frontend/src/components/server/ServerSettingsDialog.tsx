import {Dialog, Tabs} from "radix-ui";
import {BsGearFill, BsPeopleFill} from "react-icons/bs";
import {useEffect, useRef} from "react";
import {createTimeline} from "animejs";
import {FaUserShield} from "react-icons/fa6";
import RoleManagement from "./RoleManagement.tsx";

export function ServerSettingsDialog({open, onOpenChanged}: {open: boolean, onOpenChanged: (open: boolean) => void}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChanged}>
      <Dialog.Portal>
        <Dialog.Overlay className="backdrop-overlay"/>

        <Dialog.Content className="bg-gray-650 fixed inset-4 rounded-t-xl text-white flex flex-col outline-none">
          <Header/>

          <Tabs.Root className="flex-1 flex flex-row overflow-hidden" orientation="vertical">
            <Tabs.List className="flex-none basis-14 border-r-2 border-r-gray-500 flex flex-col items-center py-2 gap-1">
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Header() {
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
    <header className="flex-none bg-black/10 px-3 py-2 border-b-2 border-b-gray-500 flex flex-row items-center gap-2">
      <div ref={gearIcon}>
        {<BsGearFill className="size-10 fill-white"/>}
      </div>

      <div className="flex-1">
        <Dialog.Title className="font-bold text-xl text-white">Server Configuration Panel</Dialog.Title>
        <Dialog.Description className="text-sm text-gray-400">Click-clack, what is that sound?</Dialog.Description>
      </div>
    </header>
  );
}