import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import ChatInput, {type MessageInput} from "../../components/ChatInput.tsx";
import {messageService} from "../../api/messageService.ts";
import type {MessageDto,ServiceResponse} from "../../api/responses.ts";
import {useEffect, useRef, useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import {ChatView, type QueryModification} from "../../components/ChatView.tsx";
import {useSignalRConnection} from "../../contexts/SignalRContext.tsx";
import {HubConnectionState} from "@microsoft/signalr";
import Spinner from "../../components/Spinner.tsx";
import {AspectRatio, DropdownMenu} from "radix-ui";
import { HttpStatusCode } from "axios";
import {BsExclamationTriangle, BsPaperclip} from "react-icons/bs";
import ChatContainer from "../../components/ChatContainer.tsx";
import Egg from "../../components/Egg.tsx";

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const { channelId, channelSummary }: DirectMessagePageLoaderProps = useLoaderData();

    return (
        <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
            <header className="flex-none basis-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2">
                {!!channelId && !!channelSummary ? (
                    <>
                        <UserAvatar hasAvatar={channelSummary.otherUser.hasAvatar}
                                    className="size-8 overflow-hidden rounded-full"/>

                        <p>{channelSummary.otherUser.userName}</p>
                    </>
                ) : (
                    <p>But nobody came...</p>
                )}
            </header>

            {channelId && channelSummary ? (
                <div className="flex-1 min-h-0 flex flex-col relative">
                    <ChatContainer channelId={channelId!}/>
                </div>
            ) : Math.random() * 100 >= 2 ? (
                <div className="flex-1 min-h-0 flex flex-col justify-center items-center relative">
                    <p className="text-transparent">The room between... there is a room between...</p>
                </div>
            ) : (
                <Egg/>
            )}
        </div>
    );
}
