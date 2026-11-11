import {MessageItem} from "../components/chat/MessageItem.tsx";
import type {TimelineItem} from "../components/chat/TimelineItem.ts";
import {DateSeparator} from "../components/chat/DateSeparator.tsx";
import {useChatContainerContext} from "../contexts/ChatContainerContext.tsx";
import {SendingMessage} from "../components/chat/SendingMessage.tsx";
import {MessageType} from "../api/schema.ts";
import {CallStartItem} from "../components/chat/CallStartItem.tsx";
import type {CallEndProperties, TimelineMessagePage} from "../api/types.ts";
import {useMessageOperationsStore} from "../store/useMessageOperationsStore.ts";
import {PinMessageItem} from "../components/chat/PinMessageItem.tsx";
import {CallCancelItem} from "../components/chat/CallCancelItem.tsx";
import {CallEndItem} from "../components/chat/CallEndItem.tsx";
import type {InfiniteData} from "@tanstack/react-query";

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function useTimelineItems(
  messagePages: InfiniteData<TimelineMessagePage | null | undefined, unknown> | undefined
): TimelineItem[] {
  const { conversationId } = useChatContainerContext();

  const sendOperations = useMessageOperationsStore((state) => state.sendOperationsByConversation[conversationId]) ?? [];
  const editOperations = useMessageOperationsStore((state) => state.editOperationsByConversation[conversationId]) ?? [];
  const deletingMessageIds = useMessageOperationsStore((state) => state.deletingMessageIdsByConversation[conversationId]) ?? new Set<string>();

  const items: TimelineItem[] = [];

  if (!messagePages || messagePages.pages.length === 0) return items;

  let lastMessageDate: Date | null = null;
  let lastMessageSenderId: string | null = null;
  let messageHasHeader = true;

  for (const page of messagePages.pages.filter(p => !!p)) {
    const activeMessages = page.messages.filter(m => !deletingMessageIds.has(m.id));

    if (!activeMessages.length) continue;

    for (const message of activeMessages) {
      const messageDate = new Date(message.createdAt);

      // insert DateSeparator if calendar day changed
      const dateChanged = !lastMessageDate || !isSameDay(lastMessageDate, messageDate);
      if (dateChanged) {
        items.push(new DateSeparator({
          date: messageDate,
        }));

        lastMessageDate = messageDate;
        messageHasHeader = true;
      }

      if (message.type === MessageType.Message) {
        if (!messageHasHeader && (lastMessageSenderId !== message.sender!.id || !!message.replyTo)) {
          messageHasHeader = true;
        }

        const editingOperation = editOperations[message.id];

        items.push(
          new MessageItem({
            content: editingOperation ? { type: "edit", message: message, error: editingOperation.error, input: editingOperation.input } : { type: "message", message: message },
            showHeader: messageHasHeader,
          })
        );

        messageHasHeader = false;
        lastMessageSenderId = message.sender!.id;
      } else {
        messageHasHeader = true;

        switch (message.type) {
          case MessageType.CallStart:
            items.push(new CallStartItem({
              id: message.id,
              sender: message.sender!,
              createdAt: new Date(message.createdAt),
            }))
            break;

          case MessageType.CallCancel:
            items.push(new CallCancelItem({
              id: message.id,
              sender: message.sender!,
              createdAt: new Date(message.createdAt),
            }))
            break;

          case MessageType.CallRejected:
            items.push(new CallCancelItem({
              id: message.id,
              sender: message.sender!,
              createdAt: new Date(message.createdAt),
            }))
            break;

          case MessageType.CallEnd:
            items.push(new CallEndItem({
              id: message.id,
              sender: message.sender!,
              createdAt: new Date(message.createdAt),
              duration: (message.properties as CallEndProperties).duration,
            }))
            break;

          case MessageType.Pin:
          case MessageType.Unpin:
            items.push(new PinMessageItem({
              id: message.id,
              senderDisplayName: message.sender?.displayName ?? "???",
              senderId: message.sender?.id,
              senderAvatarVersion: message.sender?.avatarVersion,
              action: message.type === MessageType.Pin ? "pin" : "unpin",
            }));
            break;
        }
      }
    }
  }

  // sending messages appending
  for (const operation of sendOperations) {
    if (operation.conversationId !== conversationId) continue;

    items.push(new SendingMessage({
      idempotencyKey: operation.idempotencyKey,
      input: operation.input,
      error: operation.error,
    }));
  }

  return items;
}