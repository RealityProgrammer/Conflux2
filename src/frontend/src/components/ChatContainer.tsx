import {DropdownMenu} from "radix-ui";
import {BsExclamationTriangle, BsPaperclip} from "react-icons/bs";
import Spinner from "./Spinner.tsx";
import UserAvatar from "./UserAvatar.tsx";
import {ChatView, type QueryModification} from "./ChatView.tsx";
import ChatInput, {type MessageInput} from "./ChatInput.tsx";
import type {MessageDto, ServiceResponse} from "../api/responses.ts";
import {useSignalRConnection} from "../contexts/SignalRContext.tsx";
import {useEffect, useRef, useState} from "react";
import {HubConnectionState} from "@microsoft/signalr";
import {useMutation} from "@tanstack/react-query";
import {messageService} from "../api/messageService.ts";
import {HttpStatusCode} from "axios";
import {useAuthorization} from "../contexts/AuthContext.tsx";
import ChatContainerContextProvider from "../contexts/ChatContainerContext.tsx";

type SendingMessageOperation = {
    type: "sending";
    state: MessageInput;
    idempotencyKey: string;
};

type EditMessageOperation = {
    type: "edit";
    originalMessage: MessageDto;
    newBody: string | null;
};

type DeleteMessageOperation = {
    type: "delete";
    message: MessageDto;
};

type RetryOperation = SendingMessageOperation | EditMessageOperation | DeleteMessageOperation;

type ErrorMessageOperation = {
    type: "error";
    errorMessage: string;
    retryOperation: RetryOperation;
};

type MessageOperation = {
    operationId: string;
    operation: SendingMessageOperation | EditMessageOperation | DeleteMessageOperation | ErrorMessageOperation;
};

function getOperationBodyDisplayInfo(
    operation: SendingMessageOperation | EditMessageOperation | DeleteMessageOperation | ErrorMessageOperation
): [string | null, number] {
    const operationInfoGetter = (operation: SendingMessageOperation | EditMessageOperation | DeleteMessageOperation): [string | null, number] => {
        switch (operation.type) {
            case "sending":
                return [operation.state.messageBody, operation.state.attachments.length];

            case "edit":
                return [operation.newBody, 0];

            case "delete":
                return [operation.message.body, operation.message.attachments.length];

            default:
                return [null, 0];
        }
    }

    return operationInfoGetter(operation.type === "error" ? operation.retryOperation : operation);
}

export interface ChatContainerProps {
    channelId: string;
}

export default function ChatContainer({ channelId }: ChatContainerProps) {
    const authorization = useAuthorization();

    const messageQueryModification = useRef<QueryModification>(null!);
    const [processingOperations, setProcessingOperations] = useState<MessageOperation[]>([]);

    // message mutation
    type SendMessagePayload = { operationId: string, data: MessageInput, idempotencyKey: string };
    type EditMessagePayload = { operationId: string, originalMessage: MessageDto, newBody: string | null };
    type DeleteMessagePayload = { operationId: string, message: MessageDto };

    const sendMessageMutation = useMutation({
        mutationFn: async (payload: SendMessagePayload): Promise<ServiceResponse<MessageDto>> => {
            return await messageService.sendMessage(
                channelId!,
                payload.idempotencyKey,
                payload.data.messageBody,
                payload.data.attachments,
                payload.data.replyingMessage?.id
            );
        },
        onMutate: async (payload: SendMessagePayload) => {
            const processingMessage: MessageOperation | undefined =
                processingOperations.find(op => op.operationId == payload.operationId);

            if (processingMessage === undefined) {
                const newProcessingMessage: MessageOperation = {
                    operationId: payload.operationId,
                    operation: {
                        type: "sending",
                        state: payload.data,
                        idempotencyKey: payload.idempotencyKey,
                    },
                };

                setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => [...prev, newProcessingMessage]);
            } else if (processingMessage.operation.type === "error") {
                // retry
                const retryOperation: RetryOperation = processingMessage.operation.retryOperation;

                setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map((op =>
                        op.operationId === payload.operationId ? {
                            operationId: payload.operationId,
                            operation: retryOperation as SendingMessageOperation,
                        } : op
                )));
            }
        },
        onSuccess: async (data: ServiceResponse<MessageDto>, payload: SendMessagePayload) => {
            if (!data.success) {
                let reason: string;

                if (data.statusCode === HttpStatusCode.InternalServerError) {
                    reason = " due to internal server error.";
                } else {
                    reason = `. Reason: ${data.error?.message ?? "Unknown error"}`;
                }

                setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map(op =>
                    op.operationId === payload.operationId ? {
                        operationId: payload.operationId,
                        operation: {
                            type: "error",
                            errorMessage: `Cannot send message${reason}`,
                            retryOperation: op.operation as RetryOperation,
                        },
                    } : op
                ));
                return;
            }

            if (messageQueryModification.current) {
                messageQueryModification.current.appendMessage(data.data!, authorization.userProfile ?? undefined);
            }

            // remove the query
            setProcessingOperations((prev) => prev.filter(m => m.operationId !== payload.operationId));
        },
    });

    const editMessageMutation = useMutation({
        mutationFn: async (payload: EditMessagePayload): Promise<ServiceResponse<MessageDto>> => {
            return await messageService.editMessage(payload.originalMessage.id, payload.newBody);
        },
        onMutate: async (payload: EditMessagePayload) => {
            const processingMessage: MessageOperation | undefined = processingOperations.find(m => m.operationId == payload.operationId);

            if (processingMessage === undefined) {
                const newProcessingMessage: MessageOperation = {
                    operationId: payload.operationId,
                    operation: {
                        type: "edit",
                        originalMessage: payload.originalMessage,
                        newBody: payload.newBody,
                    },
                };

                setProcessingOperations((prev) => [...prev, newProcessingMessage]);
            } else if (processingMessage.operation.type === "error") {
                // retry
                const retryOperation: RetryOperation = processingMessage.operation.retryOperation;

                setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map((op =>
                        op.operationId === payload.operationId ? {
                            operationId: payload.operationId,
                            operation: retryOperation as EditMessageOperation,
                        } : op
                )));
            }
        },
        onSuccess: async (data: ServiceResponse<MessageDto>, payload: EditMessagePayload) => {
            if (!data.success) {
                let reason: string;

                if (data.statusCode === HttpStatusCode.InternalServerError) {
                    reason = " due to internal server error.";
                } else {
                    reason = `. Reason: ${data.error?.message ?? "Unknown error"}`;
                }

                setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map(op =>
                    op.operationId === payload.operationId ? {
                        operationId: payload.operationId,
                        operation: {
                            type: "error",
                            errorMessage: `Cannot edit message${reason}`,
                            retryOperation: op.operation as RetryOperation,
                        },
                    } : op
                ));
                return;
            }

            if (messageQueryModification.current) {
                messageQueryModification.current.editMessage(payload.originalMessage.id, payload.newBody);
            }

            // remove the query
            setProcessingOperations((prev) => prev.filter(m => m.operationId !== payload.operationId));
        },
    });

    const deleteMessageMutation = useMutation({
        mutationFn: async (payload: DeleteMessagePayload): Promise<ServiceResponse> => {
            return await messageService.deleteMessage(payload.message.id);
        },
        onMutate: async (payload: DeleteMessagePayload) => {
            const processingMessage: MessageOperation | undefined = processingOperations.find(m => m.operationId == payload.operationId);

            if (processingMessage === undefined) {
                const newProcessingMessage: MessageOperation = {
                    operationId: payload.operationId,
                    operation: {
                        type: "delete",
                        message: payload.message,
                    },
                };

                setProcessingOperations((prev) => [...prev, newProcessingMessage]);
            } else if (processingMessage.operation.type === "error") {
                // retry
                const retryOperation: RetryOperation = processingMessage.operation.retryOperation;

                setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map((op =>
                        op.operationId === payload.operationId ? {
                            operationId: payload.operationId,
                            operation: retryOperation as DeleteMessageOperation,
                        } : op
                )));
            }
        },
        onSuccess: async (data: ServiceResponse, payload: DeleteMessagePayload) => {
            if (!data.success) {
                let reason: string;

                if (data.statusCode === HttpStatusCode.InternalServerError) {
                    reason = " due to internal server error.";
                } else {
                    reason = `. Reason: ${data.error?.message ?? "Unknown error"}`;
                }

                setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map(op =>
                    op.operationId === payload.operationId ? {
                        operationId: payload.operationId,
                        operation: {
                            type: "error",
                            errorMessage: `Cannot delete message${reason}`,
                            retryOperation: op.operation as RetryOperation,
                        },
                    } : op
                ));
                return;
            }

            if (messageQueryModification.current) {
                messageQueryModification.current.deleteMessage(payload.message.id);
            }

            // remove the query
            setProcessingOperations((prev) => prev.filter(m => m.operationId !== payload.operationId));
        },
    });

    // messaging operation
    const handleSendMessage = async (state: MessageInput) => {
        if (!channelId) return;

        const operationId = `__queue_message-${crypto.randomUUID()}`;
        const idempotencyKey = crypto.randomUUID();
        sendMessageMutation.mutate({ operationId, data: state, idempotencyKey });

        setReplyingMessage(undefined);
    };

    const handleMessageEdited = async (originalMessage: MessageDto, newBody: string | null) => {
        if (!channelId) return;

        const operationId = `__queue_message-${crypto.randomUUID()}`;
        editMessageMutation.mutate({ operationId, originalMessage, newBody });
    };

    const handleMessageDelete = async (message: MessageDto) => {
        if (!channelId) return;

        const operationId = `__queue_message-${crypto.randomUUID()}`;
        deleteMessageMutation.mutate({ operationId, message: message });
    };

    const handleRetryOperation = async (operationId: string) => {
        if (!channelId) return;

        const operation = processingOperations.find(m => m.operationId === operationId && m.operation.type == "error");

        if (!operation  || operation.operation.type !== "error") return;

        const retryOperation: RetryOperation = (operation.operation as ErrorMessageOperation).retryOperation;

        switch (retryOperation.type) {
            case "sending":
                sendMessageMutation.mutate({
                    operationId: operationId,
                    data: retryOperation.state,
                    idempotencyKey: retryOperation.idempotencyKey
                });
                break;

            case "edit":
                editMessageMutation.mutate({
                    operationId,
                    originalMessage: retryOperation.originalMessage,
                    newBody: retryOperation.newBody,
                });
                break;

            case "delete":
                deleteMessageMutation.mutate({
                    operationId,
                    message: retryOperation.message,
                });
                break;
        }
    };

    const handleCancelSendErrorMessage = (operationId: string) => {
        setProcessingOperations((prev) => prev.filter(m => m.operationId != operationId));
    };

    const [replyingMessage, setReplyingMessage] = useState<MessageDto | undefined>(undefined);

    // signalr
    const signalrContext = useSignalRConnection();

    useEffect(() => {
        const connection = signalrContext.connection;

        if (!channelId || !signalrContext.isConnected || !connection) return;

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

    return (
        <>
            {processingOperations.length > 0 && (
                <section className="absolute top-2 inset-x-2 h-10 flex flex-row flex-nowrap gap-2 overflow-hidden z-20">
                    {processingOperations.map((message) => {
                        const isError = message.operation.type == "error";

                        const [body, attachmentCount] = getOperationBodyDisplayInfo(message.operation);

                        return (
                            <DropdownMenu.Root key={message.operationId}>
                                <DropdownMenu.Trigger asChild>
                                    <div className={`h-full aspect-square ${isError ? 'bg-[#B93A58]' : 'bg-gray-750'} rounded-md flex justify-center items-center cursor-pointer`}>
                                        {isError ? (
                                            <BsExclamationTriangle className="size-6 fill-white"/>
                                        ): (
                                            <Spinner className="size-6 fill-white" />
                                        )}
                                    </div>
                                </DropdownMenu.Trigger>

                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                        className={`w-125 rounded-md ${message.operation.type === "error" ? 'bg-[#655060] border-red-500' : 'bg-gray-625 border-gray-400'} p-4 border text-white`}
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

                                                    {body && (
                                                        <p className="max-h-20 overflow-y-auto text-sm leading-6 whitespace-pre-wrap">
                                                            { body }
                                                        </p>
                                                    )}

                                                    {attachmentCount > 0 && (
                                                        <p className="text-sm mt-1"><BsPaperclip className="fill-white size-4 inline"/> With {attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {isError && (
                                                <footer className="flex flex-col mt-4">
                                                    <p><BsExclamationTriangle className="size-5 fill-white inline"/> {(message.operation as ErrorMessageOperation).errorMessage}</p>

                                                    <div className="flex flex-row gap-2 justify-center items-center mt-4 mx-3">
                                                        <button className="button-theme-danger h-10 flex-1 cursor-pointer rounded-md" onClick={() => handleCancelSendErrorMessage(message.operationId)}>
                                                            Cancel Message
                                                        </button>

                                                        <button className="button-theme-primary h-10 flex-1 cursor-pointer rounded-md" onClick={() => handleRetryOperation(message.operationId)}>
                                                            Retry Message
                                                        </button>
                                                    </div>
                                                </footer>
                                            )}
                                        </div>

                                        <DropdownMenu.Arrow className="fill-gray-600" />
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        );
                    })}
                </section>
            )}

            <ChatContainerContextProvider
                channelId={channelId}
                replyingMessage={replyingMessage}
                onSendMessage={handleSendMessage}
                onMessageEdit={handleMessageEdited}
                onMessageDelete={handleMessageDelete}
                onMessageReplyRequested={(msg) => setReplyingMessage(msg)}
                onCancelMessageReply={() => setReplyingMessage(undefined)}
            >
                <ChatView
                    renderEmptyState={() => {
                        return <p className="text-base gray-500">And our story begin...</p>
                    }}
                    queryModificationRef={messageQueryModification}
                />

                <ChatInput/>
            </ChatContainerContextProvider>
        </>
    );
}