import {BsThreeDotsVertical} from "react-icons/bs";
import IconButton from "./IconButton.tsx";
import {DropdownMenu} from "radix-ui";
import type {ReactNode} from "react";

interface MoreActionsButtonProps {
  children: ReactNode;
}

export default function MoreActionsButton({children}: MoreActionsButtonProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton className="size-6" theme="default">
          <BsThreeDotsVertical className="size-6"/>
        </IconButton>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-50 rounded-lg bg-gray-600 p-1.5 shadow-lg text-white"
          sideOffset={5}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}