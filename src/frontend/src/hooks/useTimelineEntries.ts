import type {TimelineMessageBlockDto, UserIdentityProfileDto} from "../api/responses.ts";
import {MessageItem} from "../components/chat/MessageItem.tsx";
import type {TimelineItem} from "../components/chat/TimelineItem.ts";
import {MessageEditorItem} from "../components/chat/MessageEditorItem.tsx";

export default function useTimelineEntries(
  messageGroups: TimelineMessageBlockDto[],
  userProfiles: Record<string, UserIdentityProfileDto>,
  editingMessageId?: string,
): TimelineItem[] {
  if (!messageGroups.length) return [];

  const items: TimelineItem[] = [];

  for (const group of messageGroups) {
    const sender = userProfiles[group.senderUserId];

    items.push(editingMessageId == group.messages[0].id ?
      new MessageEditorItem({
        senderProfile: sender,
        message: group.messages[0],
        showHeader: true,
      }) : new MessageItem({
        senderProfile: sender,
        message: group.messages[0],
        showHeader: true,
      })
    );

    for (const message of group.messages.slice(1)) {
      items.push(editingMessageId == message.id ?
        new MessageEditorItem({
          senderProfile: sender,
          message: message,
          showHeader: false,
        }) : new MessageItem({
          senderProfile: sender,
          message: message,
          showHeader: false,
        })
      );
    }
  }

  return items;
}