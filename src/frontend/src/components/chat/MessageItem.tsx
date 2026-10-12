import {TimelineItem} from "./TimelineItem.ts";
import type {
  ServiceResponse,
  TimelineMessageDto,
} from "../../api/types.ts";
import {type ReactNode} from "react";
import type {TimelineContext} from "./TimelineContext.ts";
import {ContextMenu} from "radix-ui";
import {
  BsArrowReturnLeft,
  BsCopy,
  BsPencilFill,
  BsTrashFill
} from "react-icons/bs";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {toast} from "react-toastify";
import MessageBody from "./MessageBody.tsx";
import MessageAttachments from "./MessageAttachments.tsx";
import IconButton from "../IconButton.tsx";
import {FaPencil, FaRepeat, FaThumbtack, FaThumbtackSlash, FaTrashCan} from "react-icons/fa6";
import usePinMessage, {type PinMessageVariables} from "../../hooks/usePinMessage.ts";
import {MessageRow} from "./MessageRow.tsx";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import useTimelineMessageMutations from "../../hooks/useTimelineMessageMutations.ts";

type MessageItemProps = {
  message: TimelineMessageDto;
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
        message={this.data.message}
        showHeader={this.data.showHeader}
        editingStatus={this.data.editingStatus}
        context={context}
      />
    );
  }
}

interface MessageViewProps {
  message: TimelineMessageDto;
  showHeader: boolean;
  editingStatus: "none" | "error" | "saving"
  context: TimelineContext;
}

function MessageView({
  message,
  showHeader,
  editingStatus,
  context,
}: MessageViewProps) {
  const auth = useAuth();
  const { conversationId } = useChatContainerContext();
  const { appendMessage } = useTimelineMessageMutations(conversationId);

  const handleReplyTrigger = () => {
    context.actions.onMessageReplyTrigger(message);
  };

  const handleEditTrigger = () => {
    context.actions.onMessageEditTrigger(message);
  };

  const handleAttachmentClicked = (index: number) => {
    if (!message.attachments || message.attachments.length === 0) return;

    context.actions.onAttachmentClick(message.attachments, index);
  };

  const pinMessageMutation = usePinMessage({
    onSuccess: (data: ServiceResponse<TimelineMessageDto>, variables: PinMessageVariables) => {
      if (data.success) {
        context.actions.updateMessagePin(variables.messageId, variables.action === "pin");
      } else {
        toast.error(`Failed to ${variables.action} message`);
      }
    },
  });
  const { isPending: isPinning } = pinMessageMutation;

  const handlePinMessage = async () => {
    const response: ServiceResponse<TimelineMessageDto> = await pinMessageMutation.mutateAsync({
      idempotencyKey: crypto.randomUUID(),
      conversationId: message.conversationId,
      messageId: message.id,
      action: "pin"
    });

    if (response.success) {
      appendMessage(response.data!);
    }
  };

  const handleUnpinMessage = async () => {
    const response: ServiceResponse<TimelineMessageDto> = await pinMessageMutation.mutateAsync({
      idempotencyKey: crypto.randomUUID(),
      conversationId: message.conversationId,
      messageId: message.id,
      action: "unpin"
    });

    if (response.success) {
      appendMessage(response.data!);
    }
  };

  const isHighlighted = context.states.highlightedMessageId === message.id;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className={`relative w-full group block ${showHeader ? "pt-1" : ""}`}
      >
        <div className={`hover-highlight flex flex-col pt-0.5 ${isHighlighted ? "animate-messageHighlight" : ""}`}>
          <div className={`px-2 ${editingStatus === "error" ? "bg-red-500/40" : ""}`}>
            {message.replyTo && (
              <MessageRow.Reply
                messageId={message.replyTo.id}
                senderDisplayName={message.replyTo.sender?.displayName ?? "???"}
                attachmentCount={message.replyTo.attachmentCount}
                body={message.replyTo.body}
              />
            )}

            <MessageRow.Row
              header={showHeader ? {
                senderId: message.sender?.id,
                senderAvatarVersion: message.sender!.avatar?.version,
                avatarAlt: message.sender ? `Avatar of ${message.sender.displayName ?? "???"}` : undefined,
                senderDisplayName: message.sender?.displayName ?? "???",
              } : undefined}
              date={new Date(message.createdAt)}
            >
              <div className={`flex-1 space-y-1 ${editingStatus == "saving" ? "animate-pulse" : editingStatus == "error" ? "text-gray-300" : ""}`}>
                <MessageBody
                  content={message.body}
                />

                {message.attachments && message.attachments.length > 0 && (
                  <MessageAttachments
                    attachments={message.attachments}
                    onAttachmentClick={handleAttachmentClicked}
                  />
                )}
              </div>
            </MessageRow.Row>
          </div>

          {editingStatus !== "saving" && (
            <section className="hidden group-hover:flex flex-row items-center gap-2 absolute right-2 top-0 -translate-y-1/2 bg-gray-600 border-2 border-gray-500 rounded-md shadow-md px-2 py-1">
              {editingStatus === "error" && (
                <>
                  <IconButton theme="default" className="size-5" onClick={() => context.actions.retryEditOperation(message.id)}>
                    <FaRepeat className=" size-5 ml-auto"/>
                  </IconButton>

                  <IconButton theme="danger" className="size-5" onClick={() => context.actions.removeEditOperation(message.id)}>
                    <FaTrashCan className="size-5 ml-auto"/>
                  </IconButton>
                </>
              )}

              {editingStatus === "none" && (
                <>
                  {auth.userAuthorization?.id && auth.userAuthorization.id === message.sender!.id && (
                    <IconButton theme="default" className="size-5" onClick={handleEditTrigger}>
                      <FaPencil className="size-5 ml-auto"/>
                    </IconButton>
                  )}

                  <IconButton theme="default" className="size-5" onClick={handleReplyTrigger}>
                    <BsArrowReturnLeft className="size-5 ml-auto"/>
                  </IconButton>
                </>
              )}
            </section>
          )}
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="w-64 overflow-hidden rounded-md bg-gray-725 shadow-lg p-1 text-white text-sm border border-gray-500 space-y-1"
          alignOffset={5}
        >
          <ContextMenu.Item
            className="dropdown-item-default"
            onSelect={handleReplyTrigger}
          >
            Reply Message <BsArrowReturnLeft className="fill-white size-4 ml-auto"/>
          </ContextMenu.Item>

          {auth.userAuthorization?.id === message.sender!.id && context.states.allowEditMessage && (
            <ContextMenu.Item
              className="dropdown-item-default"
              onSelect={handleEditTrigger}
            >
              Edit message <BsPencilFill className="fill-white size-4 ml-auto"/>
            </ContextMenu.Item>
          )}

          {message.isPinned ? (
            <ContextMenu.Item
              className="dropdown-item-default"
              disabled={isPinning}
              onSelect={handleUnpinMessage}
            >
              Unpin Message <FaThumbtackSlash className="fill-red-500 size-4 ml-auto"/>
            </ContextMenu.Item>
          ) : (
            <ContextMenu.Item
              className="dropdown-item-default"
              disabled={isPinning}
              onSelect={handlePinMessage}
            >
              Pin Message <FaThumbtack className="fill-white size-4 ml-auto"/>
            </ContextMenu.Item>
          )}

          {auth.userAuthorization?.id === message.sender!.id && context.states.allowDeleteMessage && (
            <ContextMenu.Item
              className="dropdown-item-danger"
              onSelect={() => context.actions.onMessageDeleteTrigger(message)}
            >
              Delete message <BsTrashFill className="fill-red-500 size-4 ml-auto"/>
            </ContextMenu.Item>
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