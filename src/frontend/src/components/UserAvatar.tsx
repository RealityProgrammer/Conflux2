import {Avatar} from "radix-ui";
import {BsPerson} from "react-icons/bs";
import type {HTMLAttributes} from "react";
import {PresenceStatus} from "../graphql/types.ts";
import PresenceStatusIcon from "./PresenceStatusIcon.tsx";

interface UserAvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  presenceStatus?: PresenceStatus;
  presenceStatusCutoff?: string;
}

export default function UserAvatar({
  src,
  presenceStatus,
  className = "",
  presenceStatusCutoff = "",
  ...props
}: UserAvatarProps) {
  return (
    <div className={`relative inline-flex aspect-square rounded-full ${className}`} {...props}>
      <Avatar.Root className="size-full overflow-hidden rounded-[inherit]">
        <Avatar.Image
          className="size-full object-cover"
          src={src}
          alt="User Avatar"
        />

        <Avatar.Fallback
          className="flex size-full items-center justify-center bg-gray-100"
        >
          <BsPerson className="size-5/6 fill-black" />
        </Avatar.Fallback>
      </Avatar.Root>

      {presenceStatus && (
        <span
          className={`absolute bottom-0 right-0 translate-x-[10%] translate-y-[10%] rounded-full ${presenceStatusCutoff}`}
        >
          <PresenceStatusIcon status={presenceStatus} className="size-3"/>
        </span>
      )}
    </div>
  );
}