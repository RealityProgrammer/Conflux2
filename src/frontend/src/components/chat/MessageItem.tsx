import {TimelineItem} from "./TimelineItem.ts";
import type {
  TimelineMessageClusterItemDto,
  UserIdentityProfileDto
} from "../../api/types.ts";
import {type ReactNode} from "react";
import type {TimelineContext} from "./TimelineContext.ts";
import {ContextMenu} from "radix-ui";
import UserAvatar from "../UserAvatar.tsx";
import {BsArrowReturnLeft, BsCopy, BsPencil, BsTrash} from "react-icons/bs";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import {toast} from "react-toastify";
import {formatDate} from "date-fns";
import MessageContent from "./MessageContent.tsx";
import MessageAttachments from "./MessageAttachments.tsx";

type MessageItemProps = {
  senderProfile?: UserIdentityProfileDto;
  replyToMessageSenderProfile?: UserIdentityProfileDto;
  message: TimelineMessageClusterItemDto;
  showHeader: boolean;
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
  context: TimelineContext;
}

function MessageView({
  senderProfile,
  message,
  showHeader,
  context,
  replyToMessageSenderProfile
}: MessageViewProps) {
  const auth = useAuthorization();

  const handleAttachmentClicked = (index: number) => {
    context.actions.onAttachmentClick(message.attachments, index);
  };

  const handleExternalLinkClicked = (url?: string)=> {
    context.actions.onExternalLinkClicked(url);
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className="w-full flex flex-col"
      >
        <div className="hover-highlight px-2 group">
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
                  hasAvatar={senderProfile?.hasAvatar ?? false}
                  userId={senderProfile?.id ?? undefined}
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
            ) : (
              <>
                <span className="select-none flex-none w-10 self-start mt-1 inline-flex justify-center items-center font-normal text-xs text-gray-400 invisible group-hover:visible">
                  {formatDate(new Date(message.createdAt), "HH:mm")}
                </span>

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
              </>
            )}
          </div>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-60 overflow-hidden rounded-md bg-gray-725 shadow-lg p-1 text-white text-sm border border-gray-500"
          alignOffset={5}
        >
          <ContextMenu.Item
            className="dropdown-item-default"
            onSelect={() => {
              context.actions.onMessageReplyTrigger({
                ...message,
                senderUserId: senderProfile?.id!,
              })
            }}
          >
            Reply Message <BsArrowReturnLeft className="fill-white size-4 ml-auto"/>
          </ContextMenu.Item>

          {auth.userAuthorization?.id && auth.userAuthorization.id === senderProfile?.id && (
            <>
              <ContextMenu.Item
                className="dropdown-item-default"
                onSelect={() => {
                  context.actions.onMessageEditTrigger({
                    ...message,
                    senderUserId: senderProfile.id,
                  });
                }}
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