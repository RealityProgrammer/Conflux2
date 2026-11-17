import type { ReactNode } from "react";

interface CallWindowHeaderProps {
  title: ReactNode;
}

export default function CallWindowHeader({ title }: CallWindowHeaderProps) {
  return (
    <header className="drag-handle bg-gray-775 flex flex-row items-center justify-between border-b-2 border-gray-600 px-3 py-2 select-none">
      <span className="pointer-events-none flex-1 truncate text-sm font-semibold text-gray-200">
        {title}
      </span>

      <div className="pointer-events-auto flex flex-none cursor-default gap-3">
        {/*<IconButton theme="default">*/}
        {/*  <FaMinus className="size-4"/>*/}
        {/*</IconButton>*/}

        {/*<IconButton theme="default">*/}
        {/*  <FaExpand className="size-4"/>*/}
        {/*</IconButton>*/}

        {/*<IconButton theme="danger" onClick={onEndCall}>*/}
        {/*  <BsTelephoneXFill className="size-5"/>*/}
        {/*</IconButton>*/}
      </div>
    </header>
  );
}
