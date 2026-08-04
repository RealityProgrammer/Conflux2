import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import {type ChatInputMessageState} from "../../components/ChatInput.tsx";
import {messageService} from "../../api/messageService.ts";
import type {
    GetMessagesResponse,
    MessageDto,
    ServiceResponse
} from "../../api/responses.ts";
import {Fragment, useEffect, useLayoutEffect, useRef, useState} from "react";
import type {ReactVirtualizer} from "@tanstack/react-virtual";
import useGetMessages from "../../hooks/useGetMessages.ts";
import {type InfiniteData, useMutation, useQueryClient} from "@tanstack/react-query";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import {ChatView, type MessageDisplayInfo, type QueueableMessage} from "../../components/ChatView.tsx";

// https://tanstack.com/virtual/latest/docs/framework/react/examples/pretext?panel=code

const LOAD_COUNT = 50;

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const authorization = useAuthorization();

    const { channelId, channelSummary }: DirectMessagePageLoaderProps = useLoaderData();

    const queryClient = useQueryClient();
    const virtualizerRef = useRef<ReactVirtualizer<HTMLDivElement, Element>>(null!);

    const [isReady, setIsReady] = useState(false);

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
            userInfo: userMap.get(displayMessages[0].senderUserId),
        }

        for (let i = 1; i < displayMessages.length; i += 1) {
            const previousMessage: MessageDto = displayMessages[i - 1];
            const currentMessage: MessageDto = displayMessages[i];

            messageDisplayInfo[i] = {
                userInfo: previousMessage.senderUserId === currentMessage.senderUserId ?
                    undefined :
                    userMap.get(currentMessage.senderUserId),
            };
        }
    }

    // jump to the bottom when the messages are rendered
    useLayoutEffect(() => {
        if (displayMessages.length > 0 && !isReady) {
            requestAnimationFrame(() => {
                const virtualizer: ReactVirtualizer<HTMLDivElement, Element> = virtualizerRef.current;
                if (!virtualizer) return;

                const totalVirtualItems = virtualizer.options.count;

                virtualizer.scrollToIndex(totalVirtualItems - 1, { align: 'end' });

                requestAnimationFrame(() => {
                    setIsReady(true);
                });
            });
        } else if (!isLoading && displayMessages.length === 0) {
            setIsReady(true);
        }
    }, [displayMessages.length, isLoading, isReady]);

    // sending messages
    const sendMessageMutation = useMutation({
        mutationFn: async (payload: { tempId: string, data: ChatInputMessageState }): Promise<ServiceResponse<MessageDto>> => {
            await new Promise(resolve => setTimeout(resolve, 2000));

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

            const newMessage = data.data!;

            queryClient.setQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(
                queryKey,
                (oldData) => {
                    if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                        return oldData;
                    }

                    const newPages = [...oldData.pages];
                    const lastPageIndex = newPages.length - 1;

                    newPages[lastPageIndex] = {
                        ...newPages[lastPageIndex]!,
                        messages: [...newPages[lastPageIndex]!.messages, newMessage],
                    };

                    return {
                        ...oldData,
                        pages: newPages,
                    };
                }
            );

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

    // jump to bottom automatically when something arrive.
    const previousMessageCount = useRef(displayMessages.length);

    useEffect(() => {
        // array grew means a new message arrived, or user send something that causes queue array to changed
        if (displayMessages.length > previousMessageCount.current && isReady) {
            requestAnimationFrame(() => {
                const virtualizer = virtualizerRef.current;
                if (!virtualizer) return;

                // Jump to the newest message
                virtualizer.scrollToIndex(virtualizer.options.count - 1, { align: 'end' });
            });
        }

        previousMessageCount.current = displayMessages.length;
    }, [displayMessages.length, isReady]);

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