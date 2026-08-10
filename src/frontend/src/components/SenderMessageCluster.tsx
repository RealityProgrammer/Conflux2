import type {Attachment, MessageDto, TimelineMessageDto, TimelineMessageBlockDto, UserBasicProfileDto} from "../api/responses.ts";
import {useAuthorization} from "../contexts/AuthContext.tsx";
import {type MouseEvent, useState} from "react";
import {ContextMenu, ScrollArea} from "radix-ui";
import UserAvatar from "./UserAvatar.tsx";
import {BsArrowReturnLeft, BsCopy, BsMusicNote, BsPencil, BsTrash} from "react-icons/bs";
import MessageEditor from "./MessageEditor.tsx";
import {messageService} from "../api/messageService.ts";

export interface MessageGroupRowProps {
    messageGroup: TimelineMessageBlockDto;
    // userProfile: UserBasicProfileDto | undefined | null;
    userProfiles: Record<string, UserBasicProfileDto>;
    onAttachmentClick: (attachments: Attachment[], index: number) => void;
    onActionTriggered: (action: "edit" | "delete" | "reply", message: MessageDto) => void;
    editingMessageId?: string;
    editingMessageDraft?: string | null;
    onEditDraftChange: (draft: string) => void;
    onEditCanceled: () => void;
    onEditSaved: (newBody: string) => void;
}

export default function SenderMessageCluster({
    messageGroup,
    userProfiles,
    onAttachmentClick,
    onActionTriggered,
    editingMessageId,
    editingMessageDraft,
    onEditDraftChange,
    onEditCanceled,
    onEditSaved
}: MessageGroupRowProps) {
    const auth = useAuthorization();

    const [selectedMessage, setSelectedMessage] = useState<MessageDto | null>(null);

    const handleContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const messageElement = target.closest<HTMLElement>("[data-message-id]");

        if (messageElement?.dataset.messageId) {
            const found = messageGroup.messages.find((m) => m.id === messageElement.dataset.messageId);

            if (found) {
                setSelectedMessage({
                    senderUserId: messageGroup.senderUserId,
                    ...found,
                });
                return;
            }
        }

        setSelectedMessage(null);
    };

    const senderProfile = userProfiles[messageGroup.senderUserId];

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger
                className="w-full flex flex-col"
                onContextMenu={handleContextMenu}
            >
                {/* Header message */}
                <div
                    data-message-id={messageGroup.messages[0].id}
                    className="hover-highlight flex flex-row gap-3 px-2"
                >
                    <UserAvatar
                        hasAvatar={senderProfile?.hasAvatar ?? false}
                        userId={senderProfile?.id ?? undefined}
                        className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                        <p className="text-base text-white">{senderProfile?.userName ?? "Unknown Sender"}</p>

                        <ClusterMessage
                            message={messageGroup.messages[0]}
                            onAttachmentClick={onAttachmentClick}
                            mode={editingMessageId === messageGroup.messages[0].id ? 'edit' : 'view'}
                            editingMessageDraft={editingMessageDraft}
                            onEditDraftChange={onEditDraftChange}
                            onEditCanceled={onEditCanceled}
                            onEditSaved={onEditSaved}
                        />
                    </div>
                </div>

                {/* Consecutive messages */}
                {messageGroup.messages.slice(1).map((message) => (
                    <div
                        key={message.id}
                        data-message-id={message.id}
                        className="hover-highlight pl-15 pr-2"
                    >
                        <ClusterMessage
                            message={message}
                            onAttachmentClick={onAttachmentClick}
                            mode={editingMessageId === message.id ? 'edit' : 'view'}
                            editingMessageDraft={editingMessageDraft}
                            onEditDraftChange={onEditDraftChange}
                            onEditCanceled={onEditCanceled}
                            onEditSaved={onEditSaved}
                        />
                    </div>
                ))}
            </ContextMenu.Trigger>

            <ContextMenu.Portal>
                <ContextMenu.Content
                    className="min-w-60 overflow-hidden rounded-md bg-gray-725 shadow-lg p-1 text-white text-sm border border-gray-500"
                    alignOffset={5}
                >
                    <ContextMenu.Item
                        className="dropdown-item-default"
                        onSelect={() => {
                            if (!selectedMessage) return;

                            onActionTriggered("reply", selectedMessage);
                        }}
                    >
                        Reply Message <BsArrowReturnLeft className="fill-white size-4 ml-auto"/>
                    </ContextMenu.Item>

                    {auth.userAuthorization?.id && auth.userAuthorization.id === messageGroup.senderUserId && (
                        <>
                            <ContextMenu.Item
                                className="dropdown-item-default"
                                onSelect={() => {
                                    if (!selectedMessage) return;

                                    onActionTriggered("edit", selectedMessage);
                                }}
                                disabled={editingMessageId === selectedMessage?.id}
                            >
                                Edit message <BsPencil className="fill-white size-4 ml-auto"/>
                            </ContextMenu.Item>

                            <ContextMenu.Item
                                className="dropdown-item-danger"
                                onSelect={() => {
                                    if (!selectedMessage) return;

                                    onActionTriggered("delete", selectedMessage);
                                }}
                            >
                                Delete message <BsTrash className="fill-red-500 size-4 ml-auto"/>
                            </ContextMenu.Item>
                        </>
                    )}

                    <ContextMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                    {selectedMessage?.body && (
                        <ContextMenu.Item
                            className="dropdown-item-default"
                            onSelect={() => {
                                if (!selectedMessage?.body) return;

                                navigator.clipboard.writeText(selectedMessage.body);
                            }}
                        >
                            Copy text <BsCopy className="fill-white size-4 ml-auto"/>
                        </ContextMenu.Item>
                    )}
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    );
}

interface MessageElementRowProps {
    message: TimelineMessageDto;
    onAttachmentClick: (attachments: Attachment[], index: number) => void;
    mode: 'view' | 'edit';
    editingMessageDraft?: string | null;
    onEditDraftChange: (draft: string) => void;
    onEditCanceled: () => void;
    onEditSaved: (newBody: string) => void;
}

function ClusterMessage({
    message,
    onAttachmentClick,
    mode,
    editingMessageDraft,
    onEditDraftChange,
    onEditCanceled,
    onEditSaved
}: MessageElementRowProps) {
    return (
        <>
            {mode === "edit" ? (
                <MessageEditor
                    initialValue={message.body || ""}
                    draftValue={editingMessageDraft}
                    onDraftChange={onEditDraftChange}
                    onCancel={onEditCanceled}
                    onSave={onEditSaved}
                />
            ) : (
                <div className="text-sm">
                    { mode === "view" && message.replyTo && (
                        <>
                            <p className="text-xs mb-1">Somebody sent:</p>

                            {!!message.replyTo.body ? (
                                <p className="leading-6 whitespace-pre-wrap overflow-hidden ring ring-gray-500 bg-black/8 rounded-md px-1 py-0.5">
                                    <span className="line-clamp-2">{message.replyTo.body}</span>
                                </p>
                            ) : (
                                <p>{message.replyTo.attachmentCount} attachment{message.replyTo.attachmentCount > 1 ? 's' : ''}.</p>
                            )}
                        </>
                    )}

                    <p className="leading-6 whitespace-pre-wrap">
                        {message.body}
                    </p>
                </div>
            )}

            {message.attachments && message.attachments.length > 0 && (
                <ScrollArea.Root className={`h-32 w-full overflow-hidden group mb-1 ${message.body ? 'mt-1' : ''}`}>
                    <ScrollArea.Viewport className="size-full [&>div]:flex! [&>div]:h-full [&>div]:flex-col">
                        <div className="flex flex-row gap-1 w-max h-full group-has-data-[state=visible]:pb-3">
                            {message.attachments.map((attachment, index) => (
                                <div
                                    key={attachment.id}
                                    className="flex-none overflow-hidden relative group h-full aspect-square rounded-md border border-gray-500 cursor-pointer"
                                    onClick={() => onAttachmentClick(message.attachments, index)}
                                >
                                    {attachment.type.startsWith("image") ? (
                                        <img
                                            src={messageService.getAttachmentUrl(attachment.id, false)}
                                            alt="attachment"
                                            className="object-cover size-full"
                                            loading="lazy"
                                        />
                                    ) : attachment.type.startsWith("video") ? (
                                        <video
                                            src={messageService.getAttachmentUrl(attachment.id, false)}
                                            className="object-cover size-full"
                                            autoPlay={false}
                                        />
                                    ) : attachment.type.startsWith("audio") ? (
                                        <div className="flex flex-row justify-center items-center size-full">
                                            <BsMusicNote className="size-16 fill-white"/>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar className="flex flex-col h-2 touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight" orientation="horizontal">
                        <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-gray-400 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2" />
                    </ScrollArea.Scrollbar>
                </ScrollArea.Root>
            )}
        </>
    );
}
