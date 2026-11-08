import {type ChangeEvent, type KeyboardEvent, type ReactNode, type Ref, useLayoutEffect, useRef} from "react";
import {TimelineItem} from "./TimelineItem.ts";
import type {TimelineMessageDto} from "../../api/types.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import MessageAttachments from "./MessageAttachments.tsx";
import {MessageRow} from "./MessageRow.tsx";
import MessageTextboxEditor, {type MessageTextboxEditorRef} from "./MessageTextboxEditor.tsx";

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

  const handleCancelEdit = () => {
    context.actions.onEditCancel();
  };

  const handleAttachmentClicked = (index: number) => {
    if (!message.attachments || message.attachments.length === 0) return;

    context.actions.onAttachmentClick(message.attachments, index);
  };

  return (
    <div className="flex flex-col w-full gap-1 px-2">
      <MessageRow.Row
        header={showHeader ? {
          senderDisplayName: message.sender!.displayName ?? "???",
          senderId: message.sender?.id,
          senderAvatarVersion: message.sender!.avatarVersion,
          avatarAlt: `Avatar of ${message.sender!.displayName ?? "???"}`,
        } : undefined}
        date={new Date(message.createdAt)}
      >
        <EditorContent
          message={message}
          editDraft={context.states.editingMessageDraft}
          setEditDraft={context.actions.onEditDraftChange}
          handleCancelEdit={handleCancelEdit}
          submitEdit={(value) => {
            context.actions.onEditSaved(value);
          }}
          onAttachmentClick={handleAttachmentClicked}
        />
      </MessageRow.Row>
    </div>
  );
}

interface EditorContentProps {
  message: TimelineMessageDto;
  editDraft: string | null;
  setEditDraft: (value: string) => void;
  handleCancelEdit: () => void;
  submitEdit: (value: string | null) => void;
  onAttachmentClick: (index: number) => void;
}

function EditorContent({
  message,
  editDraft,
  setEditDraft,
  handleCancelEdit,
  submitEdit,
  onAttachmentClick,
}: EditorContentProps) {
  const textboxRef = useRef<MessageTextboxEditorRef | null>(null);

  const handleSubmit = () => {
    if (!textboxRef.current) return;
    submitEdit(textboxRef.current.convertToMarkdownString());
  };

  return (
    <div className="w-full">
      <MessageTextboxEditor
        ref={textboxRef}
        value={editDraft ?? ""}
        onTextChange={setEditDraft}
        onEnterSend={handleSubmit}
        onSuggestionChange={(suggestion) => {
          
        }}
      />

      <span className="text-xs text-gray-400">
        Escape to <span className="text-blue-400 cursor-pointer hover:underline"
        onClick={handleCancelEdit}>cancel</span>
        {" "}&#x2E31;{" "}
        Enter to <span className="text-blue-400 cursor-pointer hover:underline" onClick={handleSubmit}>save</span>
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
