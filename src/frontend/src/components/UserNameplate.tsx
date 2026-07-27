import UserAvatar from "./UserAvatar.tsx";
import type {HTMLAttributes, ReactNode} from "react";

interface UserNameplateProps extends HTMLAttributes<HTMLDivElement> {
    userId: string;
    userName: string;
    displayName: string;
    hasAvatar: boolean;
    children?: ReactNode;
}

export default function UserNameplate({ userId, userName, displayName, hasAvatar, children, className, ...props }: UserNameplateProps) {
    return (
        <div className={`flex flex-row items-center gap-3 ${className}`} {...props}>
            <UserAvatar
                userId={userId}
                hasAvatar={hasAvatar}
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