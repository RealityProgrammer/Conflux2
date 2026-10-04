import type {AttachmentDto, TimelineMessageDto} from "../../api/types.ts";

export interface TimelineContext {
  actions: {
    onMessageDeleteTrigger: (message: TimelineMessageDto) => void;
    onMessageEditTrigger: (message: TimelineMessageDto) => void;
    onMessageReplyTrigger: (message: TimelineMessageDto) => void;

    onEditCancel: () => void;
    onEditDraftChange: (body: string | null) => void;
    onEditSaved: (newBody: string | null) => void;

    onAttachmentClick: (attachments: AttachmentDto[], index: number) => void;
    onExternalLinkClicked: (url?: string) => void;

    retrySendingOperation: (operationId: string) => void;
    removeSendingOperation: (operationId: string) => void;

    retryEditOperation: (messageId: string) => void;
    removeEditOperation: (messageId: string) => void;

    updateMessagePin: (messageId: string, isPinned: boolean) => void;
  };

  states: {
    editingMessageDraft: string | null;
  }
}