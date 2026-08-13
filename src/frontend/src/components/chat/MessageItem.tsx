import {TimelineItem} from "./TimelineItem.ts";
import type {
  TimelineMessageDto,
  UserIdentityProfileDto
} from "../../api/responses.ts";
import {type Key, type MouseEvent, type ReactNode, useState} from "react";
import type {TimelineContext} from "./TimelineContext.ts";
import {ContextMenu, ScrollArea} from "radix-ui";
import UserAvatar from "../UserAvatar.tsx";
import {BsArrowReturnLeft, BsCopy, BsMusicNote, BsPencil, BsTrash} from "react-icons/bs";
import {messageService} from "../../api/messageService.ts";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import MessageAttachments from "./MessageAttachments.tsx";
import {estimateMessageLayout} from "./utils.ts";

export type MessageItemProps = {
  senderProfile: UserIdentityProfileDto;
  message: TimelineMessageDto;
  showHeader: boolean;
}

export class MessageItem extends TimelineItem<MessageItemProps> {
  readonly type = "message_cluster";

  constructor(data: MessageItemProps) {
    super(data);
  }

  measureHeight(displayWidth: number, context: TimelineContext): number {
    let height = 0;

    if (this.data.showHeader) {
      height += 24;
    }

    const message = this.data.message;

    if (message.body) {
      const messageDisplayWidth = context.states.viewportWidth - 16 - 52;

      height += estimateMessageLayout(message.id, message.body, messageDisplayWidth, 24).height;
    }

    if (message.attachments && message.attachments.length > 0) {
      height += 128;
    }

    return height;
  }

  render(measuredHeight: number, context: TimelineContext): ReactNode {
    return (
      <MessageWithHeaderView
        key={`message-${this.data.message.id}`}
        senderProfile={this.data.senderProfile}
        message={this.data.message}
        showHeader={this.data.showHeader}
        context={context}
      />
    );
  }
}

interface MessageWithHeaderViewProps {
  senderProfile: UserIdentityProfileDto;
  message: TimelineMessageDto;
  showHeader: boolean;
  context: TimelineContext;
}

export default function MessageWithHeaderView({
  senderProfile,
  message,
  showHeader,
  context,
}: MessageWithHeaderViewProps) {
  const auth = useAuthorization();

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className="w-full flex flex-col"
      >
        <div className="hover-highlight px-2">
          {showHeader ? (
            <div className="flex flex-row gap-3">
              <UserAvatar
                hasAvatar={senderProfile?.hasAvatar ?? false}
                userId={senderProfile?.id ?? undefined}
                className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
              />

              <div className="flex-1 min-w-0">
                <p className="text-base text-white">{senderProfile?.userName ?? "Unknown Sender"}</p>

                <MessageContentView message={message}/>
              </div>
            </div>
          ) : (
            <div className="ml-13">
              <MessageContentView message={message}/>
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
              // onActionTriggered("reply", selectedMessage);
            }}
          >
            Reply Message <BsArrowReturnLeft className="fill-white size-4 ml-auto"/>
          </ContextMenu.Item>

          {auth.userAuthorization?.id && auth.userAuthorization.id === senderProfile.id && (
            <>
              <ContextMenu.Item
                className="dropdown-item-default"
                onSelect={() => {
                  // onActionTriggered("edit", selectedMessage);
                }}
              >
                Edit message <BsPencil className="fill-white size-4 ml-auto"/>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="dropdown-item-danger"
                onSelect={() => {
                  context.actions.onMessageDeleteRequest({
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

function MessageContentView({message}: { message: TimelineMessageDto }) {
  return (
    <>
      <div className="text-sm">
        {message.replyTo && (
          <div className="min-w-0">
            <p className="text-xs mb-1">Somebody sent:</p>

            {!!message.replyTo.body ? (
              <p className="leading-6 whitespace-pre-wrap wrap-break-word overflow-hidden ring ring-gray-500 bg-black/8 rounded-md px-1 py-0.5">
                <span className="line-clamp-2 whitespace-pre-wrap wrap-break-word">
                  {message.replyTo.body}
                </span>
              </p>
            ) : (
              <p>{message.replyTo.attachmentCount} attachment{message.replyTo.attachmentCount > 1 ? 's' : ''}.</p>
            )}
          </div>
        )}

        <p className="leading-6 whitespace-pre-wrap wrap-break-word">
          {message.body}
        </p>
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <MessageAttachments
          attachments={message.attachments}
          onAttachmentClick={(index) => {}}
        />
      )}
    </>
  );
}