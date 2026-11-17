import type {
  MessageAttachmentDto,
  TimelineMessageDto,
} from "../../api/types.ts";
import type { SelectedEmoji } from "./EmojiPanel.tsx";

export interface TimelineContext {
  actions: {
    onMessageDeleteTrigger: (message: TimelineMessageDto) => void;
    onMessageEditTrigger: (message: TimelineMessageDto) => void;
    onMessageReplyTrigger: (message: TimelineMessageDto) => void;

    onEditCancel: () => void;
    onAttachmentClick: (
      attachments: MessageAttachmentDto[],
      index: number,
    ) => void;

    retrySendingOperation: (idempotencyKey: string) => void;
    removeSendingOperation: (idempotencyKey: string) => void;

    retryEditOperation: (messageId: string) => void;
    removeEditOperation: (messageId: string) => void;

    updateMessagePin: (messageId: string, isPinned: boolean) => void;

    onEmojiPanelOpen: (
      anchor: HTMLElement,
      side: "top" | "bottom" | "left" | "right",
      onSelect: (emoji: SelectedEmoji) => void,
      onOpenChange?: (open: boolean) => void,
    ) => void;
  };

  states: {
    // editingMessageDraft: string | null;
    highlightedMessageId: string | null;
    allowEditMessage: boolean;
    allowDeleteMessage: boolean;
  };
}
