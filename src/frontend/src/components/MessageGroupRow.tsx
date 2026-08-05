import { ScrollArea } from "radix-ui";
import type { Attachment, MessageGroup, MessageElement, UserBasicProfileSummary } from "../api/responses";
import UserAvatar from "./UserAvatar";
import { messageService } from "../api/messageService";

export interface MessageGroupRowProps {
    messageGroup: MessageGroup;
    userProfile: UserBasicProfileSummary | undefined | null;
    onAttachmentClick: (attachments: Attachment[], index: number) => void;
}

export default function MessageGroupRow({ messageGroup, userProfile, onAttachmentClick }: MessageGroupRowProps) {
    return (
        <div className="w-full flex flex-col">
            <div className="hover-highlight">
                <div className="flex flex-row gap-3 mx-2">
                    <UserAvatar
                        hasAvatar={userProfile?.hasAvatar ?? false}
                        userId={userProfile?.id ?? undefined}
                        className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                        <p className="text-base text-white">{userProfile?.userName ?? "Unknown Sender"}</p>

                        <MessageElement message={messageGroup.messages[0]} onAttachmentClick={onAttachmentClick}/>
                    </div>
                </div>
            </div>

            {messageGroup.messages.filter((_, index: number): boolean => index != 0).map((message) => (
                <div key={message.id} className="hover-highlight pl-15 pr-2">
                    <MessageElement message={message} onAttachmentClick={onAttachmentClick}/>
                </div>
            ))}
        </div>
    );
}

interface MessageElementProps {
    message: MessageElement;
    onAttachmentClick: (attachments: Attachment[], index: number) => void;
}

function MessageElement({ message, onAttachmentClick }: MessageElementProps) {
    return (
        <>
            {message.body && (
                <p className="text-sm leading-6 whitespace-pre-wrap">
                    {message.body}
                </p>
            )}

            {message.attachments && message.attachments.length > 0 && (
                <ScrollArea.Root className="h-32 w-full overflow-hidden group">
                    <ScrollArea.Viewport className="size-full [&>div]:flex! [&>div]:h-full [&>div]:flex-col">
                        <div className="flex flex-row gap-1 w-max h-full group-has-data-[state=visible]:pb-3">
                            {message.attachments.map((attachment, index) => (
                                <div
                                    key={attachment.id}
                                    className="flex-none overflow-hidden relative group h-full aspect-square rounded-md border border-gray-500 cursor-pointer"
                                    onClick={() => onAttachmentClick(message.attachments, index)}
                                >
                                    {attachment.type.startsWith("image") && (
                                        <img
                                            src={messageService.getAttachmentUrl(attachment.id, false)}
                                            alt="attachment"
                                            className="object-cover size-full"
                                        />
                                    )}
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
