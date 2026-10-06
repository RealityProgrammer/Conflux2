import {MessageItem} from "../components/chat/MessageItem.tsx";
import type {TimelineItem} from "../components/chat/TimelineItem.ts";
import {MessageEditorItem} from "../components/chat/MessageEditorItem.tsx";
import {DateSeparator} from "../components/chat/DateSeparator.tsx";
import {useChatContainerContext} from "../contexts/ChatContainerContext.tsx";
import {SendingMessage} from "../components/chat/SendingMessage.tsx";
import {MessageType} from "../api/schema.ts";
import {CallStartItem} from "../components/chat/CallStartItem.tsx";
import type {CallEndProperties} from "../api/types.ts";
import {useMessageOperationsStore} from "../store/useMessageOperationsStore.ts";
import {PinMessageItem} from "../components/chat/PinMessageItem.tsx";
import {userService} from "../api/userService.ts";
import useTimelineMessages from "./useTimelineMessages.ts";
import {CallCancelItem} from "../components/chat/CallCancelItem.tsx";
import {CallEndItem} from "../components/chat/CallEndItem.tsx";

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function useTimelineItems(
  editingMessageId?: string,
): TimelineItem[] {
  const { conversationId } = useChatContainerContext();
  const { queryResult: { data: messageData } } = useTimelineMessages(conversationId);

  const sendOperations = useMessageOperationsStore((state) => state.sendOperations);
  const deletingMessageIds = useMessageOperationsStore((state) => state.deletingMessageIds);
  const editOperations = useMessageOperationsStore((state) => state.editOperations);

  const items: TimelineItem[] = [];

  if (messageData && messageData.pages.length > 0) {
    let lastMessageDate: Date | null = null;
    let lastMessageSenderId: string | null = null;
    let messageHasHeader = true;

    for (const messagePages of messageData.pages.filter(p => !!p)) {
      const activeMessages = messagePages.messages.filter(m => !deletingMessageIds.includes(m.id));
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
          const displayingMessage = editingOperation ?
            { ...message, body: editingOperation.newBody } :
            message;

          items.push(editingMessageId === message.id ?
            new MessageEditorItem({
              message: displayingMessage,
              showHeader: messageHasHeader,
            }) :
            new MessageItem({
              message: displayingMessage,
              showHeader: messageHasHeader,
              editingStatus: editingOperation ? editingOperation.error ? "error" : "saving" : "none",
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
                senderAvatarSrc: message.sender?.avatarRevision ? userService.getAvatarUrl(message.sender.id, message.sender.avatarRevision) : undefined,
                action: message.type === MessageType.Pin ? "pin" : "unpin",
              }));
              break;
          }
        }
      }
    }
  }

  // sending messages appending
  for (const operation of sendOperations) {
    if (operation.conversationId !== conversationId) continue;

    items.push(new SendingMessage({
      operationId: operation.id,
      input: operation.input,
      error: operation.error,
    }));
  }

  return items;
}