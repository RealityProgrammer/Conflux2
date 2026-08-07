import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import ChatInput, {type ChatInputMessageState} from "../../components/ChatInput.tsx";
import {messageService} from "../../api/messageService.ts";
import type {GetMessagesResponse, MessageDto,MessageGroup,ServiceResponse, UserBasicProfileSummary} from "../../api/responses.ts";
import {useEffect, useRef, useState} from "react";
import useGetMessages from "../../hooks/useGetMessages.ts";
import {type InfiniteData, useMutation, useQueryClient} from "@tanstack/react-query";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import {ChatView, type QueryModification} from "../../components/ChatView.tsx";
import type {MessageReceivedEvent} from "../../api/events.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import {useSignalRConnection} from "../../contexts/SignalRContext.tsx";
import {HubConnectionState} from "@microsoft/signalr";
import {userService} from "../../api/userService.ts";
import Spinner from "../../components/Spinner.tsx";
import { DropdownMenu } from "radix-ui";
import { HttpStatusCode } from "axios";
import { BsExclamationTriangle } from "react-icons/bs";

const LOAD_COUNT = 50;

export type QueueingMessage = {
    tempId: string;
    state: ChatInputMessageState;
    errorMessage?: string;
};

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const authorization = useAuthorization();

    const { channelId, channelSummary }: DirectMessagePageLoaderProps = useLoaderData();

    const signalrContext = useSignalRConnection();

    useEffect(() => {
        const connection = signalrContext.connection;

        if (!channelId || !channelSummary || !signalrContext.isConnected || !connection) return;

        let joinPromise: Promise<void> = connection!.invoke("JoinChannel", channelId).then(() => {
            console.log("Channel joined");
        });

        return () => {
            joinPromise.then(() => {
                if (connection.state === HubConnectionState.Connected) {
                    connection!.invoke("LeaveChannel", channelId);
                }
            });
        }
    }, [channelId, signalrContext.isConnected]);

    const messageQueryUpdate = useRef<QueryModification>(null!);

    const [queueingMessages, setQueueingMessages] = useState<QueueingMessage[]>([]);

    const sendMessageMutation = useMutation({
        mutationFn: async (payload: { tempId: string, data: ChatInputMessageState }): Promise<ServiceResponse<MessageDto>> => {
            return await messageService.sendMessage(channelId!, payload.data.messageBody, payload.data.attachments);
        },
        onMutate: async (payload: { tempId: string, data: ChatInputMessageState }) => {
            // check if the message is already queued, likely due to retry sending

            const queuedMessage: QueueingMessage | undefined = queueingMessages.find(m => m.tempId == payload.tempId && !!m.errorMessage);

            if (queuedMessage) {
                // append to last, clear out the error message.
                setQueueingMessages((prev) => [...prev.filter(m => m.tempId != payload.tempId), { ...queuedMessage, errorMessage: undefined }]);
            } else {
                const queueingMessage: QueueingMessage = {
                    tempId: payload.tempId,
                    state: payload.data,
                };

                setQueueingMessages((prev) => [...prev, queueingMessage]);
            }
        },
        onSuccess: async (data: ServiceResponse<MessageDto>, payload: { tempId: string, data: ChatInputMessageState }) => {
            if (!data.success) {
                let reason: string;

                if (data.statusCode === HttpStatusCode.InternalServerError) {
                    reason = " due to internal server error.";
                } else {
                    reason = `. Reason: ${data.error!.message}`;
                }

                setQueueingMessages((prev) => prev.map(m =>
                    m.tempId === payload.tempId ? { ...m, errorMessage: `Failed to send message${reason}` } : m
                ));
                return;
            }

            if (messageQueryUpdate.current) {
                messageQueryUpdate.current.pushNewMessage(data.data!, authorization.userProfile ?? undefined);
            }

            // remove the query
            setQueueingMessages((prev) => prev.filter(m => m.tempId !== payload.tempId));
        },
        onError: (_err, payload: { tempId: string, data: ChatInputMessageState }) => {
            setQueueingMessages((prev) => prev.map(m =>
                m.tempId === payload.tempId ? { ...m, errorMessage: "Failed to send message due to unknown reason." } : m
            ));
        },
    });

    const handleSendMessage = async (state: ChatInputMessageState) => {
        if (!channelId) return;

        const tempId = `__queue_message-${Date.now()}`;
        sendMessageMutation.mutate({ tempId, data: state });
    };

    const handleMessageEdited = (message: MessageDto) => {
        if (messageQueryUpdate.current) {
            messageQueryUpdate.current.editMessage(message);
        }
    };

    const handleCancelSendErrorMessage = (tempId: string) => {
        setQueueingMessages((prev) => prev.filter(m => m.tempId != tempId));
    };

    const handleRetrySendMessage = async (tempId: string) => {
        const msg: QueueingMessage | undefined = queueingMessages.find(m => m.tempId == tempId && !!m.errorMessage);

        if (!msg) {
            return;
        }

        sendMessageMutation.mutate({ tempId, data: msg.state });
    };

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

            <div className="flex-1 min-h-0 flex flex-col relative">
                {queueingMessages.length > 0 && (
                    <section className="absolute top-2 inset-x-2 h-10 flex flex-row flex-nowrap gap-2 overflow-hidden z-20">
                        {queueingMessages.map((message) => (
                           	<DropdownMenu.Root key={message.tempId}>
                                <DropdownMenu.Trigger asChild>
                                    <div className={`h-full aspect-square ${message.errorMessage ? 'bg-[#B93A58]' : 'bg-gray-750'} rounded-md flex justify-center items-center cursor-pointer`}>
                                        {message.errorMessage ? (
                                            <BsExclamationTriangle className="size-6 fill-white"/>
                                        ): (
                                            <Spinner className="size-6 fill-white" />
                                        )}
                                    </div>
                                </DropdownMenu.Trigger>

                          		<DropdownMenu.Portal>
                         			<DropdownMenu.Content
                                        className={`w-125 rounded-md ${message.errorMessage ? 'bg-[#655060] border-red-500' : 'bg-gray-625 border-gray-400'} p-4 border text-white`}
                        				sideOffset={5}
                         			>
                                        <div className="w-full flex flex-col">
                                            <div className="flex flex-row gap-3">
                                                <UserAvatar
                                                    hasAvatar={authorization.userProfile?.hasAvatar ?? false}
                                                    userId={authorization.userProfile?.id ?? undefined}
                                                    className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle"
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base text-white">{authorization.userProfile?.displayName ?? "Unknown sender"}</p>

                                                    <p className="max-h-20 overflow-y-auto text-sm leading-6 whitespace-pre-wrap">
                                                        {message.state.messageBody}
                                                    </p>

                                                    {message.state.attachments.length > 0 && (
                                                        <p className="mt-2">With {message.state.attachments.length} attachment{message.state.attachments.length > 1 ? 's' : ''}.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {message.errorMessage && (
                                                <footer className="flex flex-col mt-4">
                                                    <p><BsExclamationTriangle className="size-5 fill-white inline" /> {message.errorMessage}</p>

                                                    <div className="flex flex-row gap-2 justify-center items-center mt-4 mx-3">
                                                        <button className="button-theme-danger h-10 flex-1 cursor-pointer rounded-md" onClick={() => handleCancelSendErrorMessage(message.tempId)}>
                                                            Cancel Message
                                                        </button>

                                                        <button className="button-theme-primary h-10 flex-1 cursor-pointer rounded-md" onClick={() => handleRetrySendMessage(message.tempId)}>
                                                            Resend Message
                                                        </button>
                                                    </div>
                                                </footer>
                                            )}
                                        </div>

                        				<DropdownMenu.Arrow className="fill-gray-600" />
                         			</DropdownMenu.Content>
                          		</DropdownMenu.Portal>
                           	</DropdownMenu.Root>
                        ))}
                    </section>
                )}

                <ChatView
                    channelId={channelId!}
                    emptyState={() => {
                        return <p className="text-base gray-500">And our story begin...</p>
                    }}
                    onMessageEdited={handleMessageEdited}
                    queryModificationRef={messageQueryUpdate}
                />

                <ChatInput
                    disabled={!channelId || !channelSummary}
                    onSendMessage={handleSendMessage}
                />
            </div>
        </div>
    );
}
