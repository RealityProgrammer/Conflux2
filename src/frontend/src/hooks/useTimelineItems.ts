import type {TimelineMessageClusterDto, UserIdentityProfileDto} from "../api/types.ts";
import {MessageItem} from "../components/chat/MessageItem.tsx";
import type {TimelineItem} from "../components/chat/TimelineItem.ts";
import {MessageEditorItem} from "../components/chat/MessageEditorItem.tsx";
import {useEffect} from "react";
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
  messageGroups: TimelineMessageClusterDto[],
  userProfiles: Record<string, UserIdentityProfileDto>,
  editingMessageId?: string,
): TimelineItem[] {
  const items: TimelineItem[] = [];
  let lastMessageDate: Date | null = null;

  // foreach message cluster group from the backend
  for (const group of messageGroups) {
    if (!group.messages.length) continue;

    const sender = userProfiles[group.senderUserId];

    for (let i = 0; i < group.messages.length; i++) {
      const message = group.messages[i];
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

      items.push(new ItemClass({
        senderProfile: sender,
        message,
        showHeader,
        replyToMessageSenderProfile,
      }));
    }
  }

  // sending messages appending
  const { sendingMessageOperations } = useChatContainerContext()!;

  for (const operation of sendingMessageOperations) {
    items.push(new SendingMessage({
      operationId: operation.operationId,
      input: operation.input,
      error: operation.error,
    }));
  }

  return items;
}