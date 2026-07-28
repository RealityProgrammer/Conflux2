import {BsPersonDash} from "react-icons/bs";
import IconButton from "./IconButton.tsx";
import type {HTMLAttributes} from "react";

interface UnfriendButtonProps extends HTMLAttributes<HTMLButtonElement> {
    isExecuting: boolean;
}

function Unfriend({ isExecuting, ...props }: UnfriendButtonProps) {
    return (
        <IconButton theme="danger" isLoading={isExecuting} {...props}>
            <BsPersonDash className="size-6"/>
        </IconButton>
    );
}

export const FriendActionButtons = {
    Unfriend,
};