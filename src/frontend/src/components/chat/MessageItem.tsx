import {TimelineItem} from "./TimelineItem.ts";
import type {
  TimelineMessageClusterItemDto,
  UserIdentityProfileDto
} from "../../api/types.ts";
import {type ReactNode} from "react";
import type {TimelineContext} from "./TimelineContext.ts";
import {ContextMenu} from "radix-ui";
import UserAvatar from "../UserAvatar.tsx";
import {BsArrowReturnLeft, BsCopy, BsPencil, BsPencilFill, BsTrash} from "react-icons/bs";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {toast} from "react-toastify";
import {formatDate} from "date-fns";
import MessageContent from "./MessageContent.tsx";
import MessageAttachments from "./MessageAttachments.tsx";
import IconButton from "../IconButton.tsx";
import {FaRepeat, FaTrashCan} from "react-icons/fa6";
import {userService} from "../../api/userService.ts";

type MessageItemProps = {
  senderProfile?: UserIdentityProfileDto;
  replyToMessageSenderProfile?: UserIdentityProfileDto;
  message: TimelineMessageClusterItemDto;
  showHeader: boolean;
  editingStatus: "none" | "error" | "saving";
}

export class MessageItem extends TimelineItem<MessageItemProps> {
  constructor(data: MessageItemProps) {
    super(data);
  }

  getKey(): string {
    return `message_${this.data.message.id}`;
  }

  render(context: TimelineContext): ReactNode {
    return (
      <MessageView
        key={`message-${this.data.message.id}`}
        senderProfile={this.data.senderProfile}
        replyToMessageSenderProfile={this.data.replyToMessageSenderProfile}
        message={this.data.message}
        showHeader={this.data.showHeader}
        editingStatus={this.data.editingStatus}
        context={context}
      />
    );
  }
}

interface MessageViewProps {
  senderProfile?: UserIdentityProfileDto;
  replyToMessageSenderProfile?: UserIdentityProfileDto;
  message: TimelineMessageClusterItemDto;
  showHeader: boolean;
  editingStatus: "none" | "error" | "saving"
  context: TimelineContext;
}

function MessageView({
  senderProfile,
  message,
  showHeader,
  replyToMessageSenderProfile,
  editingStatus,
  context,
}: MessageViewProps) {
  const auth = useAuth();

  const handleReplyTrigger = () => {
    context.actions.onMessageReplyTrigger({
      ...message,
      senderUserId: senderProfile?.id!,
    });
  };

  const handleEditTrigger = () => {
    context.actions.onMessageEditTrigger({
      ...message,
      senderUserId: senderProfile?.id!,
    });
  };

  const handleAttachmentClicked = (index: number) => {
    context.actions.onAttachmentClick(message.attachments, index);
  };

  const handleExternalLinkClicked = (url?: string)=> {
    context.actions.onExternalLinkClicked(url);
  };

  const handleRetryEditingOperation = () => {
    context.actions.retryEditingOperation(message.id);
  };

  const handleRemoveEditingOperation = () => {
    context.actions.removeEditingOperation(message.id);
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className="relative w-full flex flex-col hover-highlight group"
      >
        <div className={`px-2 ${editingStatus === "error" ? "bg-red-500/40" : ""}`}>
          {message.replyTo && replyToMessageSenderProfile && (
            <div className="min-w-0">
              <p className="text-xs ml-13">
                {buildReplyText(replyToMessageSenderProfile.displayName ?? "???", message.replyTo.bodySnippet, message.replyTo.hasMoreBody, message.replyTo.attachmentCount)}
              </p>
            </div>
          )}

          <div className="flex flex-row gap-3">
            {showHeader ? (
              <>
                <UserAvatar
                  src={senderProfile?.avatarRevision ? userService.getAvatarUrl(senderProfile.id, senderProfile.avatarRevision) : undefined}
                  className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {senderProfile?.userName ?? "Unknown Sender"}
                    {" "}
                    <span className="select-none font-normal text-xs text-gray-400 invisible group-hover:visible">
                      {formatDate(new Date(message.createdAt), "HH:mm")}
                    </span>
                  </p>

                  <div className={`${editingStatus == "saving" ? "animate-pulse" : editingStatus == "error" ? "text-gray-300" : ""}`}>
                    <MessageContent
                      content={message.body}
                      onLinkClicked={handleExternalLinkClicked}
                    />

                    {message.attachments && message.attachments.length > 0 && (
                      <MessageAttachments
                        attachments={message.attachments}
                        onAttachmentClick={handleAttachmentClicked}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="select-none flex-none w-10 self-start mt-1 inline-flex justify-center items-center font-normal text-xs text-gray-400 invisible group-hover:visible">
                  {formatDate(new Date(message.createdAt), "HH:mm")}
                </span>

                <div className={`flex-1 ${editingStatus == "saving" ? "animate-pulse" : editingStatus == "error" ? "text-gray-300" : ""}`}>
                  <MessageContent
                    content={message.body}
                    onLinkClicked={handleExternalLinkClicked}
                  />

                  {message.attachments && message.attachments.length > 0 && (
                    <MessageAttachments
                      attachments={message.attachments}
                      onAttachmentClick={handleAttachmentClicked}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {editingStatus !== "saving" && (
          <section className="hidden group-hover:flex flex-row items-center gap-2 absolute right-2 top-0 -translate-y-1/2 bg-gray-600 border-2 border-gray-500 rounded-md shadow-md px-2 py-1">
            {editingStatus === "error" && (
              <>
                <IconButton theme="default" className="size-5" onClick={handleRetryEditingOperation}>
                  <FaRepeat className=" size-5 ml-auto"/>
                </IconButton>

                <IconButton theme="danger" className="size-5" onClick={handleRemoveEditingOperation}>
                  <FaTrashCan className="size-5 ml-auto"/>
                </IconButton>
              </>
            )}

            {editingStatus === "none" && (
              <>
                {auth.userAuthorization?.id && auth.userAuthorization.id === senderProfile?.id && (
                  <IconButton theme="default" className="size-5" onClick={handleEditTrigger}>
                    <BsPencilFill className="size-5 ml-auto"/>
                  </IconButton>
                )}

                <IconButton theme="default" className="size-5" onClick={handleReplyTrigger}>
                  <BsArrowReturnLeft className="size-5 ml-auto"/>
                </IconButton>
              </>
            )}
          </section>
        )}
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-60 overflow-hidden rounded-md bg-gray-725 shadow-lg p-1 text-white text-sm border border-gray-500"
          alignOffset={5}
        >
          <ContextMenu.Item
            className="dropdown-item-default"
            onSelect={handleReplyTrigger}
          >
            Reply Message <BsArrowReturnLeft className="fill-white size-4 ml-auto"/>
          </ContextMenu.Item>

          {auth.userAuthorization?.id && auth.userAuthorization.id === senderProfile?.id && (
            <>
              <ContextMenu.Item
                className="dropdown-item-default"
                onSelect={handleEditTrigger}
              >
                Edit message <BsPencil className="fill-white size-4 ml-auto"/>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="dropdown-item-danger"
                onSelect={() => {
                  context.actions.onMessageDeleteTrigger({
                    ...message,
                    senderUserId: senderProfile.id,
                  })
                }}
              >
                Delete message <BsTrash className="fill-red-500 size-4 ml-auto"/>
              </ContextMenu.Item>
            </>
          )}

          <ContextMenu.Separator className="horizontal-separator my-1.5"/>

          {message?.body && (
            <ContextMenu.Item
              className="dropdown-item-default"
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(message.body!);
                } catch {
                  toast.error("Failed to copy message body to clipboard, possible API error?")
                }
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

function buildReplyText(name: string, content: string | null, ellipsis: boolean, attachmentCount: number) {
  const attachmentText = attachmentCount > 0 ? `${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''}` : '';

  return `@${name} sent${content ? `: ${content}${ellipsis ? '...' : ''}${attachmentCount ? ` (with ${attachmentText})` : ''}` : ` ${attachmentText}`}`;
}