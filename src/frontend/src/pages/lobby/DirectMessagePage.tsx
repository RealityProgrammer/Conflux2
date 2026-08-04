import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import {type ChatInputMessageState} from "../../components/ChatInput.tsx";
import {messageService} from "../../api/messageService.ts";
import type {
    GetMessagesResponse,
    MessageDto,
    ServiceResponse, UserBasicProfileSummary
} from "../../api/responses.ts";
import {useEffect, useState} from "react";
import useGetMessages from "../../hooks/useGetMessages.ts";
import {type InfiniteData, useMutation, useQueryClient} from "@tanstack/react-query";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import {ChatView, type MessageDisplayInfo, type QueueableMessage} from "../../components/ChatView.tsx";
import type {MessageReceivedEvent} from "../../api/events.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import {useSignalRConnection} from "../../contexts/SignalRContext.tsx";
import {HubConnectionState} from "@microsoft/signalr";
import {userService} from "../../api/userService.ts";

const LOAD_COUNT = 50;

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
        allMessages,
        userMap,
        queryKey
    } = useGetMessages(channelId, LOAD_COUNT);

    const [pendingQueue, setPendingQueue] = useState<QueueableMessage[]>([]);

    const displayMessages = [...allMessages, ...pendingQueue];

    // bake the rendering info
    const messageDisplayInfo: MessageDisplayInfo[] = new Array(displayMessages.length);

    if (displayMessages.length > 0) {
        messageDisplayInfo[0] = {
            userInfo: userMap[displayMessages[0].senderUserId],
        }

        for (let i = 1; i < displayMessages.length; i += 1) {
            const previousMessage: MessageDto = displayMessages[i - 1];
            const currentMessage: MessageDto = displayMessages[i];

            messageDisplayInfo[i] = {
                userInfo: previousMessage.senderUserId === currentMessage.senderUserId ?
                    undefined :
                    userMap[currentMessage.senderUserId],
            };
        }
    }

    // sending messages
    const pushNewMessage = (newMessage: MessageDto, userSummary?: UserBasicProfileSummary) => {
        queryClient.setQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(
            queryKey,
            (oldData) => {
                if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return oldData;
                }

                const newPages = [...oldData.pages];
                const lastPageIndex = newPages.length - 1;
                const lastPage = newPages[lastPageIndex]!;

                if (userSummary && !lastPage.users[newMessage.senderUserId]) {
                    lastPage.users[newMessage.senderUserId] = userSummary;
                }

                newPages[lastPageIndex] = {
                    ...newPages[lastPageIndex]!,
                    messages: [...newPages[lastPageIndex]!.messages, newMessage],
                    users: lastPage.users,
                };

                return {
                    ...oldData,
                    pages: newPages,
                };
            }
        );
    };

    const sendMessageMutation = useMutation({
        mutationFn: async (payload: { tempId: string, data: ChatInputMessageState }): Promise<ServiceResponse<MessageDto>> => {
            return await messageService.sendMessage(channelId!, payload.data.messageBody, payload.data.attachments);
        },
        onMutate: async (payload: { tempId: string, data: ChatInputMessageState }) => {
            const message: QueueableMessage = {
                id: payload.tempId,
                body: payload.data.messageBody,
                senderUserId: authorization.userProfile?.id ?? `arbitrary-${new Date()}`,
                createdAt: new Date(),
                attachments: payload.data.attachments.map((_file, index) => ({ id: `attachment-${index}`, type: '__loading' })),
                queueStatus: 'sending',
            };

            setPendingQueue((prev) => [...prev, message]);
        },
        onSuccess: async (data: ServiceResponse<MessageDto>, payload: { tempId: string, data: ChatInputMessageState }) => {
            if (!data.success) {
                setPendingQueue((prev) => prev.map(m =>
                    m.id === payload.tempId ? { ...m, queueStatus: 'error' } : m
                ));
                return;
            }

            pushNewMessage(data.data!, authorization.userProfile ?? undefined);

            // remove the query
            setPendingQueue((prev) => prev.filter(m => m.id !== payload.tempId));
        },
        onError: (_err, payload: { tempId: string, data: ChatInputMessageState }) => {
            setPendingQueue((prev) => prev.map(m =>
                m.id === payload.tempId ? { ...m, queueStatus: 'error' } : m
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

                const cached = page.users[senderId];

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

            <ChatView
                messages={displayMessages}
                messageDisplayInfo={messageDisplayInfo}
                isLoading={isLoading}
                hasPreviousPage={hasPreviousPage}
                isFetchingPreviousPage={isFetchingPreviousPage}
                fetchPreviousPage={fetchPreviousPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                onSendMessage={handleSendMessage}
                isInputDisabled={!channelId || !channelSummary}
                emptyState={() => {
                    return <p className="text-base gray-500">And our story begin...</p>
                }}
            />
        </div>
    );
}