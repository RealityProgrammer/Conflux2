import {Avatar} from "radix-ui";
import {BsPerson} from "react-icons/bs";
import {userService} from "../api/userService.ts";
import type {HTMLAttributes} from "react";

interface UserAvatarProps {
    userId?: string;
    hasAvatar: boolean;
}

export default function UserAvatar({ userId, hasAvatar, ...props }: UserAvatarProps & HTMLAttributes<HTMLDivElement>) {
    return (
        <Avatar.Root {...props}>
            <Avatar.Image
                className="size-full rounded-[inherit] object-cover"
                src={hasAvatar && userId ? userService.getAvatarUrl(userId, false) : undefined}
                alt="Test"
            />
            <Avatar.Fallback
                className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11"
                delayMs={1000}
            >
                <BsPerson className="fill-black size-5/6"/>
            </Avatar.Fallback>
        </Avatar.Root>
    );
}