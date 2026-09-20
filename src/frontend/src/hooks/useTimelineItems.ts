import {MessageItem} from "../components/chat/MessageItem.tsx";
import type {TimelineItem} from "../components/chat/TimelineItem.ts";
import {MessageEditorItem} from "../components/chat/MessageEditorItem.tsx";
import {DateSeparator} from "../components/chat/DateSeparator.tsx";
import {useChatContainerContext} from "../contexts/ChatContainerContext.tsx";
import {SendingMessage} from "../components/chat/SendingMessage.tsx";

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
  const {
    messageClusters,
    userProfiles,
    sendingMessageOperations,
    deletingMessageIds,
    editingOperations,
  } = useChatContainerContext()!;

  const items: TimelineItem[] = [];
  let lastMessageDate: Date | null = null;

  // foreach message cluster group from the backend
  for (const group of messageClusters) {
    const activeMessages = group.messages.filter(m => !deletingMessageIds.has(m.id));
    if (!activeMessages.length) continue;

    const sender = userProfiles[group.senderUserId];

    for (let i = 0; i < activeMessages.length; i++) {
      const message = activeMessages[i];
      const editingOperation = editingOperations.get(message.id);

      const messageDate = new Date(message.createdAt);

      // insert DateSeparator if calendar day changed
      const dateChanged = !lastMessageDate || !isSameDay(lastMessageDate, messageDate);
      if (dateChanged) {
        items.push(new DateSeparator({
          date: messageDate,
        }));

        lastMessageDate = messageDate;
      }

      // show header for the first message in a cluster or if a date separator split the cluster
      const showHeader = i === 0 || dateChanged;

      const replyToMessageSenderProfile = message.replyTo
        ? userProfiles[message.replyTo.senderUserId]
        : undefined;

      const isEditing = editingMessageId === message.id;
      const ItemClass = isEditing ? MessageEditorItem : MessageItem;

      const displayingMessage = editingOperation ?
        { ...message, body: editingOperation.newBody } :
        message;

      items.push(new ItemClass({
        senderProfile: sender,
        message: displayingMessage,
        showHeader,
        replyToMessageSenderProfile,
        editingStatus: editingOperation ? editingOperation.error ? "error" : "saving" : "none",
      }));
    }
  }

  // sending messages appending
  for (const operation of sendingMessageOperations) {
    items.push(new SendingMessage({
      operationId: operation.operationId,
      input: operation.input,
      error: operation.error,
    }));
  }

  return items;
}