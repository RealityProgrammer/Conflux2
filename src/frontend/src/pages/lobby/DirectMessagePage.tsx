import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import ChatInput, {type ChatInputMessageState} from "../../components/ChatInput.tsx";
import {messageService} from "../../api/messageService.ts";
import type {GetMessagesResponse, MessageDto,MessageGroup,ServiceResponse, UserBasicProfileSummary} from "../../api/responses.ts";
import {useEffect, useState} from "react";
import useGetMessages from "../../hooks/useGetMessages.ts";
import {type InfiniteData, useMutation, useQueryClient} from "@tanstack/react-query";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import {ChatView} from "../../components/ChatView.tsx";
import type {MessageReceivedEvent} from "../../api/events.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import {useSignalRConnection} from "../../contexts/SignalRContext.tsx";
import {HubConnectionState} from "@microsoft/signalr";
import {userService} from "../../api/userService.ts";
import Spinner from "../../components/Spinner.tsx";
import { DropdownMenu } from "radix-ui";

const LOAD_COUNT = 50;

export type QueueingMessage = {
    tempId: string;
    body: string | undefined;
    attachmentCount: number;
    error?: boolean;
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

    const queryClient = useQueryClient();

    const {
        useInfiniteQueryResult: {
            hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage, hasNextPage, isFetchingNextPage, fetchNextPage,
            isLoading,
        },
        allMessageGroups,
        userMap,
        queryKey
    } = useGetMessages(channelId, LOAD_COUNT);

    // sending messages
    const pushNewMessage = (newMessage: MessageDto, userSummary?: UserBasicProfileSummary) => {
        queryClient.setQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(
            queryKey,
            (oldData) => {
                if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return oldData;
                }

                const lastPage = oldData.pages.at(-1)!;
                const updatedLastPage = { ...lastPage };

                if (userSummary && !lastPage.users.map(u => u.id).includes(newMessage.senderUserId)) {
                    updatedLastPage.users = [...(updatedLastPage.users || []), userSummary];
                }

                const currentGroups = updatedLastPage.messageGroups || [];

                if (lastPage.messageGroups?.length > 0) {
                    const lastMessageGroup = lastPage.messageGroups.at(-1)!;

                    // was the new message sent by the same person on the last group of the last page?
                    const isSameUser =
                        lastMessageGroup.senderUserId == newMessage.senderUserId;

                    if (isSameUser) {
                        const updatedGroup: MessageGroup = {
                            ...lastMessageGroup,
                            messages: [...lastMessageGroup.messages, newMessage],
                        };

                        updatedLastPage.messageGroups = [
                            ...currentGroups.slice(0, -1),
                            updatedGroup,
                        ];
                    } else {
                        updatedLastPage.messageGroups = [
                            ...currentGroups,
                            {
                                senderUserId: newMessage.senderUserId,
                                messages: [newMessage],
                            },
                        ];
                    }
                } else {
                    updatedLastPage.messageGroups = [
                        {
                            senderUserId: newMessage.senderUserId,
                            messages: [newMessage],
                        },
                    ];
                }

                return {
                    ...oldData,
                    pages: [...oldData.pages.slice(0, -1), updatedLastPage],
                };
            }
        );
    };

    const [queueingMessages, setQueueingMessages] = useState<QueueingMessage[]>([]);

    const sendMessageMutation = useMutation({
        mutationFn: async (payload: { tempId: string, data: ChatInputMessageState }): Promise<ServiceResponse<MessageDto>> => {
            return await messageService.sendMessage(channelId!, payload.data.messageBody, payload.data.attachments);
        },
        onMutate: async (payload: { tempId: string, data: ChatInputMessageState }) => {
            const queueingMessage: QueueingMessage = {
                tempId: payload.tempId,
                body: payload.data.messageBody,
                attachmentCount: payload.data.attachments.length,
            };

            setQueueingMessages((prev) => [...prev, queueingMessage]);
        },
        onSuccess: async (data: ServiceResponse<MessageDto>, payload: { tempId: string, data: ChatInputMessageState }) => {
            pushNewMessage(data.data!, authorization.userProfile ?? undefined);

            // remove the query
            setQueueingMessages((prev) => prev.filter(m => m.tempId !== payload.tempId));
        },
        onError: (_err, payload: { tempId: string, data: ChatInputMessageState }) => {
            setQueueingMessages((prev) => prev.map(m =>
                m.tempId === payload.tempId ? { ...m, error: true } : m
            ));
        },
    });

    const handleSendMessage = async (messagePayload: ChatInputMessageState) => {
        if (!channelId) return;

        const tempId = `__queue_message-${Date.now()}`;
        sendMessageMutation.mutate({ tempId, data: messagePayload });
    };

    // change the cache pages when message received
    useSignalREvent("MessageReceived", async (event: MessageReceivedEvent) => {
        const senderId = event.message.senderUserId;

        // check if there is this user summary in any page
        const currentCache = queryClient.getQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(queryKey);
        let knownUser: UserBasicProfileSummary | undefined = undefined;

        if (currentCache?.pages) {
            for (const page of currentCache.pages) {
                if (!page?.users) continue;

                const cached = page.users.find((value) => value.id == senderId);

                if (cached) {
                    knownUser = cached;
                    break;
                }
            }
        }

        // if we don't know this user, fetch from api
        if (!knownUser) {
            try {
                // Replace with your actual user service fetch call
                const response = await userService.getUserBasicProfile(senderId);
                knownUser = response.data ?? undefined;
            } catch (error) {
                console.error("Failed to fetch user summary for new message", error);
            }
        }

        pushNewMessage(event.message, knownUser);
    });

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
                                    <div className="h-full aspect-square bg-gray-750 rounded-md flex justify-center items-center cursor-pointer">
                                        <Spinner className="size-6 fill-white"/>
                                    </div>
                                </DropdownMenu.Trigger>

                          		<DropdownMenu.Portal>
                         			<DropdownMenu.Content
                        				className="w-125 rounded-md bg-gray-625 p-5 border border-gray-400 text-white"
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
                                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                                                    </p>

                                                    {message.attachmentCount > 0 && (
                                                        <p className="mt-2">With {message.attachmentCount} attachment{message.attachmentCount > 1 ? 's' : ''}.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                        				<DropdownMenu.Arrow className="fill-gray-600" />
                         			</DropdownMenu.Content>
                          		</DropdownMenu.Portal>
                           	</DropdownMenu.Root>
                        ))}
                    </section>
                )}

                <ChatView
                    messageGroups={allMessageGroups}
                    userProfiles={userMap}
                    isLoading={isLoading}
                    hasPreviousPage={hasPreviousPage}
                    isFetchingPreviousPage={isFetchingPreviousPage}
                    fetchPreviousPage={fetchPreviousPage}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                    emptyState={() => {
                        return <p className="text-base gray-500">And our story begin...</p>
                    }}
                />

                <ChatInput
                    disabled={!channelId || !channelSummary}
                    onSendMessage={handleSendMessage}
                />
            </div>
        </div>
    );
}
