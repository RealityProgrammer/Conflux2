import {TimelineItem} from "./TimelineItem.ts";
import type {
  TimelineMessageDto,
  UserIdentityProfileDto
} from "../../api/responses.ts";
import {type ReactNode} from "react";
import type {TimelineContext} from "./TimelineContext.ts";
import {ContextMenu} from "radix-ui";
import UserAvatar from "../UserAvatar.tsx";
import {BsArrowReturnLeft, BsCopy, BsPencil, BsTrash} from "react-icons/bs";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import MessageAttachments from "./MessageAttachments.tsx";
import {estimateMessageLayout} from "./utils.ts";

export type MessageItemProps = {
  senderProfile: UserIdentityProfileDto;
  replyToMessageSenderProfile?: UserIdentityProfileDto;
  message: TimelineMessageDto;
  showHeader: boolean;
}

export class MessageItem extends TimelineItem<MessageItemProps> {
  constructor(data: MessageItemProps) {
    super(data);
  }

  measureHeight(context: TimelineContext): number {
    let height = 0;

    if (this.data.showHeader) {
      height += 24;
    }

    const messageDisplayWidth = context.states.viewportWidth - 16 - 52;
    const message = this.data.message;

    if (message.body) {
      const layout = estimateMessageLayout(message.id, message.body, messageDisplayWidth, 24);
      height += layout.height;
    }

    if (message.attachments && message.attachments.length > 0) {
      height += 128;
    }

    if (message.replyTo && this.data.replyToMessageSenderProfile) {
      const layout = estimateMessageLayout(
        `reply_${message.replyTo.messageId}`,
        buildReplyText(this.data.replyToMessageSenderProfile.displayName, message.replyTo.bodySnippet, message.replyTo.hasMoreBody, message.replyTo.attachmentCount),
        messageDisplayWidth,
        16
      );
      height += layout.height;
    }

    return height;
  }

  render(measuredHeight: number, context: TimelineContext): ReactNode {
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
  senderProfile: UserIdentityProfileDto;
  replyToMessageSenderProfile?: UserIdentityProfileDto;
  message: TimelineMessageDto;
  showHeader: boolean;
  context: TimelineContext;
}

export default function MessageView({
  senderProfile,
  message,
  showHeader,
  context,
  replyToMessageSenderProfile
}: MessageViewProps) {
  const auth = useAuthorization();

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className="w-full flex flex-col"
      >
        <div className="hover-highlight px-2">
          {message.replyTo && replyToMessageSenderProfile && (
            <div className="min-w-0">
              <p className="text-xs ml-13">
                {buildReplyText(replyToMessageSenderProfile.displayName, message.replyTo.bodySnippet, message.replyTo.hasMoreBody, message.replyTo.attachmentCount)}
              </p>
            </div>
          )}

          {showHeader ? (
            <div className="flex flex-row gap-3">
              <UserAvatar
                hasAvatar={senderProfile?.hasAvatar ?? false}
                userId={senderProfile?.id ?? undefined}
                className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
              />

              <div className="flex-1 min-w-0">
                <p className="text-base text-white">{senderProfile?.userName ?? "Unknown Sender"}</p>

                <MessageContentView
                  message={message}
                  onAttachmentClick={(index: number) => context.actions.onAttachmentClick(message.attachments, index)}
                />
              </div>
            </div>
          ) : (
            <div className="ml-13">
              <MessageContentView
                message={message}
                onAttachmentClick={(index: number) => context.actions.onAttachmentClick(message.attachments, index)}
              />
            </div>
          )}
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
                senderUserId: senderProfile.id,
              })
            }}
          >
            Reply Message <BsArrowReturnLeft className="fill-white size-4 ml-auto"/>
          </ContextMenu.Item>

          {auth.userAuthorization?.id && auth.userAuthorization.id === senderProfile.id && (
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

          <ContextMenu.Separator className="h-px bg-gray-500 my-1.5"/>

          {message?.body && (
            <ContextMenu.Item
              className="dropdown-item-default"
              onSelect={() => {
                navigator.clipboard.writeText(message.body!);
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
  const attachmentText = attachmentCount > 0 ? `${attachmentCount} attachment${attachmentCount > 1 && 's'}` : '';

  return `@${name} sent${content ? `: ${content}${ellipsis ? '...' : ''}${attachmentCount ? ` (with ${attachmentText})` : ''}` : ` ${attachmentText}`}`;
}

function MessageContentView({message, onAttachmentClick}: { message: TimelineMessageDto, onAttachmentClick: (index: number) => void }) {
  return (
    <>
      <div className="text-sm">
        <p className="leading-6 whitespace-pre-wrap wrap-break-word">
          {message.body}
        </p>
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <MessageAttachments
          attachments={message.attachments}
          onAttachmentClick={onAttachmentClick}
        />
      )}
    </>
  );
}