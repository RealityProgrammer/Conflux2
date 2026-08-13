import type {Attachment, MessageDto} from "../../api/responses.ts";

export interface TimelineContext {
  actions: {
    onMessageDeleteTrigger: (message: MessageDto) => void;
    onMessageEditTrigger: (message: MessageDto) => void;
    onMessageReplyTrigger: (message: MessageDto) => void;

    onEditCancel: () => void;
    onEditDraftChange: (body: string | null) => void;
    onEditSaved: (newBody: string | null) => void;

    onAttachmentClick: (attachments: Attachment[], index: number) => void;
  };

  states: {
    viewportWidth: number;
    editingMessageDraft: string | null;
  }
}