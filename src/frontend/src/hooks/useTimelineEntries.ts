import type {TimelineMessageBlockDto, UserIdentityProfileDto} from "../api/responses.ts";
import {MessageItem} from "../components/chat/MessageItem.tsx";
import type {TimelineItem} from "../components/chat/TimelineItem.ts";

export default function useTimelineEntries(
  messageGroups: TimelineMessageBlockDto[],
  userProfiles: Record<string, UserIdentityProfileDto>
): TimelineItem[] {
  if (!messageGroups.length) return [];

  const items: TimelineItem[] = [];

  for (const group of messageGroups) {
    const sender = userProfiles[group.senderUserId];

    items.push(new MessageItem({
      senderProfile: userProfiles[group.senderUserId],
      message: group.messages[0],
      showHeader: true,
    }));

    for (const message of group.messages.slice(1)) {
      items.push(new MessageItem({
        senderProfile: sender,
        message: message,
        showHeader: false,
      }));
    }
  }

  return items;
}