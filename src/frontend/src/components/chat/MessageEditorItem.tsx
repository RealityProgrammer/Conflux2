import {type ChangeEvent, type KeyboardEvent, type ReactNode, type Ref, useLayoutEffect, useRef} from "react";
import {TimelineItem} from "./TimelineItem.ts";
import type {TimelineMessageDto} from "../../api/types.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import MessageAttachments from "./MessageAttachments.tsx";
import {MessageRow} from "./MessageRow.tsx";

export type MessageEditorItemProps = {
  message: TimelineMessageDto;
  showHeader: boolean;
}

export class MessageEditorItem extends TimelineItem<MessageEditorItemProps> {
  constructor(data: MessageEditorItemProps) {
    super(data);
  }

  getKey(): string {
    return `message-editor_${this.data.message.id}`;
  }

  render(context: TimelineContext): ReactNode {
    return (
      <MessageEditorView
        key={`editor-${this.data.message.id}`}
        message={this.data.message}
        showHeader={this.data.showHeader}
        context={context}
      />
    );
  }
}

export interface MessageEditorProps {
  message: TimelineMessageDto;
  showHeader: boolean;
  context: TimelineContext;
}

function MessageEditorView({
  message,
  showHeader,
  context,
}: MessageEditorProps) {
  const currentDraft = context.states.editingMessageDraft ?? message.body ?? "";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [currentDraft]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleCancelEdit = () => {
    context.actions.onEditCancel();
  };

  const handleAttachmentClicked = (index: number) => {
    if (!message.attachments || message.attachments.length === 0) return;

    context.actions.onAttachmentClick(message.attachments, index);
  };

  const submitEdit = () => {
    const trimmedBody = textareaRef.current!.value.trim();
    if (trimmedBody.length === 0) return;

    if (trimmedBody === message.body) {
      handleCancelEdit();
      return;
    }

    handleEditSave(trimmedBody);
  };

  const handleEditSave = (body: string | null) => context.actions.onEditSaved(body);

  return (
    <div className="flex flex-col w-full gap-1 px-2">
      <MessageRow.Row
        header={showHeader ? {
          senderDisplayName: message.sender!.displayName ?? "???",
          senderId: message.sender?.id,
          senderAvatarVersion: message.sender!.avatar?.version,
          avatarAlt: `Avatar of ${message.sender!.displayName ?? "???"}`,
        } : undefined}
        date={new Date(message.createdAt)}
      >
        <EditorContent
          textareaRef={textareaRef}
          message={message}
          editDraft={context.states.editingMessageDraft}
          setEditDraft={context.actions.onEditDraftChange}
          handleKeyDown={handleKeyDown}
          handleCancelEdit={handleCancelEdit}
          submitEdit={submitEdit}
          onAttachmentClick={handleAttachmentClicked}
        />
      </MessageRow.Row>
    </div>
  );
}

interface EditorContentProps {
  textareaRef: Ref<HTMLTextAreaElement>;
  message: TimelineMessageDto;
  editDraft: string | null;
  setEditDraft: (value: string) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleCancelEdit: () => void;
  submitEdit: () => void;
  onAttachmentClick: (index: number) => void;
}

function EditorContent({
  textareaRef,
  message,
  editDraft,
  setEditDraft,
  handleKeyDown,
  handleCancelEdit,
  submitEdit,
  onAttachmentClick,
}: EditorContentProps) {
  return (
    <div className="w-full">
      <textarea
        ref={textareaRef}
        rows={1}
        value={editDraft ?? ""}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
          setEditDraft(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        maxLength={1024}
        className="block input-field min-h-10 max-h-40 w-full text-sm resize-none py-2 px-3 overflow-y-auto leading-6 whitespace-pre-wrap"
      />

      <span className="text-xs text-gray-400">
        Escape to <span className="text-blue-400 cursor-pointer hover:underline"
        onClick={handleCancelEdit}>cancel</span>
        {" "}&#x2E31;{" "} {/*Explicit spacing*/}
        Enter to <span className="text-blue-400 cursor-pointer hover:underline" onClick={submitEdit}>save</span>
      </span>

      {message.attachments && message.attachments.length > 0 && (
        <MessageAttachments
          attachments={message.attachments}
          onAttachmentClick={onAttachmentClick}
        />
      )}
    </div>
  );
}