import type {ReactNode} from "react";
import IconButton from "../IconButton.tsx";
import {FaExpand, FaMinus} from "react-icons/fa6";
import {BsTelephoneXFill} from "react-icons/bs";

interface CallWindowHeaderProps {
  title: ReactNode;
  onEndCall: () => void;
}

export default function CallWindowHeader({
  title,
  onEndCall,
}: CallWindowHeaderProps) {
  return (
    <header
      className="drag-handle bg-gray-775 px-3 py-2 flex flex-row justify-between items-center select-none border-b-2 border-gray-600"
    >
      <span className="flex-1 text-gray-200 text-sm font-semibold truncate pointer-events-none animate-pulse">
        {title}
      </span>

      <div className="flex-none flex gap-3 pointer-events-auto cursor-default">
        {/*<IconButton theme="default">*/}
        {/*  <FaMinus className="size-4"/>*/}
        {/*</IconButton>*/}

        {/*<IconButton theme="default">*/}
        {/*  <FaExpand className="size-4"/>*/}
        {/*</IconButton>*/}

        <IconButton theme="danger" onClick={onEndCall}>
          <BsTelephoneXFill className="size-5"/>
        </IconButton>
      </div>
    </header>
  );
}