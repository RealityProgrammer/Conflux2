import UserAvatar from "./UserAvatar.tsx";
import {type HTMLAttributes, type ReactNode} from "react";
import {random} from "animejs";

interface UserNameplateProps extends HTMLAttributes<HTMLDivElement> {
    userId: string;
    userName: string;
    displayName: string;
    hasAvatar?: boolean;
    children?: ReactNode;
}

function Root({ userId, userName, displayName, hasAvatar, children, className, ...props }: UserNameplateProps){
    return (
        <div className={`flex flex-row items-center gap-3 ${className}`} {...props}>
            <UserAvatar
                userId={userId}
                hasAvatar={hasAvatar ?? false}
                className="flex-none min-h-10 aspect-square self-stretch h-auto select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"/>

            <div className="flex-1 flex flex-col min-w-0">
                <p className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {displayName}
                </p>

                <p className="text-sm text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                    @{userName}
                </p>
            </div>

            <div className="flex-none flex flex-row items-center gap-2">
                {children}
            </div>
        </div>
    );
}

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`flex flex-row items-center gap-3 ${className ?? ""}`} {...props}>
            <div className="flex-none min-h-10 aspect-square self-stretch h-auto select-none items-center justify-center overflow-hidden rounded-full align-middle bg-white/10 animate-pulse"/>

            <div className="flex-1 flex flex-col min-w-0">
                <div className="h-4 rounded bg-white/10 animate-pulse" style={{ width: `${random(144, 224)}px` }}/>
                <div className="h-4 rounded bg-white/10 animate-pulse mt-1" style={{ width: `${random(80, 128)}px` }}/>
            </div>
        </div>
    );
}

export const UserNameplate = {
    Root,
    Skeleton,
};