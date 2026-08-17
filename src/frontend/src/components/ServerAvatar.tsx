import {Avatar} from "radix-ui";
import {BsPerson} from "react-icons/bs";
import type {HTMLAttributes} from "react";
import {communityServerService} from "../api/communityServerService.ts";

interface UserAvatarProps {
  serverId: string;
  hasAvatar: boolean;
}

export default function ServerAvatar({serverId, hasAvatar, ...props}: UserAvatarProps & HTMLAttributes<HTMLDivElement>) {
  return (
    <Avatar.Root {...props}>
      <Avatar.Image
        className="size-full rounded-[inherit] object-cover"
        src={hasAvatar ? communityServerService.getAvatarUrl(serverId, false) : undefined}
        alt="Avatar"
      />
      <Avatar.Fallback
        className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11"
      >
        <BsPerson className="fill-black size-5/6"/>
      </Avatar.Fallback>
    </Avatar.Root>
  );
}