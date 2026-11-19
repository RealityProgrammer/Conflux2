import { MessageItem } from "../components/conversation/MessageItem.tsx";
import type { TimelineItem } from "../components/conversation/TimelineItem.ts";
import { DateSeparator } from "../components/conversation/DateSeparator.tsx";
import { useChatContainerContext } from "../contexts/ChatContainerContext.tsx";
import { SendingMessage } from "../components/conversation/SendingMessage.tsx";
import { MessageType } from "../api/schema.ts";
import { CallStartItem } from "../components/conversation/CallStartItem.tsx";
import type { CallEndProperties, TimelineMessagePage } from "../api/types.ts";
import { useMessageOperationsStore } from "../store/useMessageOperationsStore.ts";
import { PinMessageItem } from "../components/conversation/PinMessageItem.tsx";
import { CallCancelItem } from "../components/conversation/CallCancelItem.tsx";
import { CallEndItem } from "../components/conversation/CallEndItem.tsx";
import type { InfiniteData } from "@tanstack/react-query";
import { EditingMessageItem } from "../components/conversation/EditingMessageItem.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function useTimelineItems(
  messagePages: InfiniteData<TimelineMessagePage | null | undefined, unknown> | undefined,
): TimelineItem[] {
  const { conversationId } = useChatContainerContext();
  const auth = useAuth();

  const sendOperations =
    useMessageOperationsStore((state) => state.sendOperationsByConversation[conversationId]) ?? [];
  const editOperations =
    useMessageOperationsStore((state) => state.editOperationsByConversation[conversationId]) ?? [];
  const deletingMessageIds =
    useMessageOperationsStore((state) => state.deletingMessageIdsByConversation[conversationId]) ??
    new Set<string>();

  const items: TimelineItem[] = [];

  if (!messagePages || messagePages.pages.length === 0) return items;

  let lastMessageDate: Date | null = null;
  let lastMessageSenderId: string | null = null;
  let showHeader = true;

  for (const page of messagePages.pages) {
    if (!page) continue;

    const activeMessages = page.messages.filter((m) => !deletingMessageIds.has(m.id));

    if (!activeMessages.length) continue;

    for (const message of activeMessages) {
      const messageDate = new Date(message.createdAt);

      // insert DateSeparator if calendar day changed
      const dateChanged = !lastMessageDate || !isSameDay(lastMessageDate, messageDate);
      if (dateChanged) {
        items.push(
          new DateSeparator({
            date: messageDate,
          }),
        );

        lastMessageDate = messageDate;
        showHeader = true;
      }

      if (message.type === MessageType.Message) {
        if (!showHeader && (lastMessageSenderId !== message.sender!.id || !!message.replyTo)) {
          showHeader = true;
        }

        const editingOperation = editOperations[message.id];

        if (editingOperation) {
          items.push(
            new EditingMessageItem({
              message,
              input: editingOperation.input,
              error: editingOperation.error,
              showHeader: showHeader,
            }),
          );
        } else {
          items.push(
            new MessageItem({
              message,
              showHeader: showHeader,
            }),
          );
        }

        showHeader = false;
        lastMessageSenderId = message.sender!.id;
      } else {
        showHeader = true;

        switch (message.type) {
          case MessageType.CallStart:
            items.push(
              new CallStartItem({
                id: message.id,
                sender: message.sender!,
                createdAt: new Date(message.createdAt),
              }),
            );
            break;

          case MessageType.CallCancel:
            items.push(
              new CallCancelItem({
                id: message.id,
                sender: message.sender!,
                createdAt: new Date(message.createdAt),
              }),
            );
            break;

          case MessageType.CallRejected:
            items.push(
              new CallCancelItem({
                id: message.id,
                sender: message.sender!,
                createdAt: new Date(message.createdAt),
              }),
            );
            break;

          case MessageType.CallEnd:
            items.push(
              new CallEndItem({
                id: message.id,
                sender: message.sender!,
                createdAt: new Date(message.createdAt),
                duration: (message.properties as CallEndProperties).duration,
              }),
            );
            break;

          case MessageType.Pin:
          case MessageType.Unpin:
            items.push(
              new PinMessageItem({
                id: message.id,
                senderDisplayName: message.sender?.displayName ?? "???",
                senderId: message.sender?.id,
                senderAvatarVersion: message.sender?.avatarVersion,
                action: message.type === MessageType.Pin ? "pin" : "unpin",
              }),
            );
            break;
        }
      }
    }
  }

  // sending messages appending
  items.push(
    ...sendOperations
      .filter((o) => o.conversationId === conversationId)
      .map((o) => {
        return new SendingMessage({
          showHeader: lastMessageSenderId !== auth.userProfile?.id,
          idempotencyKey: o.idempotencyKey,
          input: o.input,
          error: o.error,
        });
      }),
  );

  return items;
}
