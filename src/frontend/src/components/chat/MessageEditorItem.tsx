import {type ChangeEvent, type KeyboardEvent, type ReactNode, type Ref, useLayoutEffect, useRef} from "react";
import {TimelineItem} from "./TimelineItem.ts";
import type {MessageDto, TimelineMessageDto, UserIdentityProfileDto} from "../../api/responses.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import {estimateMessageLayout} from "./utils.ts";
import MessageAttachments from "./MessageAttachments.tsx";
import UserAvatar from "../UserAvatar.tsx";

export type MessageEditorItemProps = {
  senderProfile: UserIdentityProfileDto;
  message: TimelineMessageDto;
  showHeader: boolean;
}

export class MessageEditorItem extends TimelineItem<MessageEditorItemProps> {
  constructor(data: MessageEditorItemProps) {
    super(data);
  }

  measureHeight(context: TimelineContext): number {
    let height = 0;

    if (this.data.showHeader) {
      height += 24;
    }

    const currentDraft = context.states.editingMessageDraft ?? this.data.message.body ?? "";
    const textContentWidth = Math.max(1, context.states.viewportWidth - 16 - 52 - 24);

    const contentLayout = estimateMessageLayout(
      `${this.data.message.id}_edit-draft`,
      currentDraft,
      textContentWidth,
      24
    );

    let contentHeight = contentLayout.height;

    if (currentDraft.endsWith("\n")) {
      contentHeight += 24;
    }

    const rawTextareaHeight = contentHeight + 16;
    const constrainedTextareaHeight = Math.min(Math.max(40, rawTextareaHeight), 160);

    height += constrainedTextareaHeight;
    height += 20; // height for instructions.

    if (this.data.message.attachments && this.data.message.attachments.length > 0) {
      height += 128;
    }

    return height;
  }

  render(measuredHeight: number, context: TimelineContext): ReactNode {
    return (
      <MessageEditorView
        key={`editor-${this.data.message.id}`}
        senderProfile={this.data.senderProfile}
        message={{ ...this.data.message, senderUserId: this.data.senderProfile.id }}
        showHeader={this.data.showHeader}
        context={context}
      />
    );
  }
}

export interface MessageEditorProps {
  message: MessageDto;
  senderProfile: UserIdentityProfileDto;
  showHeader: boolean;
  context: TimelineContext;
}

function MessageEditorView({
  message,
  senderProfile,
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

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    context.actions.onEditDraftChange(e.target.value);
  };

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
      {showHeader ? (
        <div className="flex flex-row gap-3">
          <UserAvatar
            hasAvatar={senderProfile?.hasAvatar ?? false}
            userId={senderProfile?.id ?? undefined}
            className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
          />

          <div className="flex-1 min-w-0">
            <p className="text-base text-white">{senderProfile?.userName ?? "Unknown Sender"}</p>

            <EditorContent
              textareaRef={textareaRef}
              message={message}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              handleCancelEdit={handleCancelEdit}
              submitEdit={submitEdit}
              onAttachmentClick={(index) => context.actions.onAttachmentClick(message.attachments, index)}
            />
          </div>
        </div>
      ) : (
        <div className="ml-13">
          <EditorContent
            textareaRef={textareaRef}
            message={message}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            handleCancelEdit={handleCancelEdit}
            submitEdit={submitEdit}
            onAttachmentClick={(index) => context.actions.onAttachmentClick(message.attachments, index)}
          />
        </div>
      )}
    </div>
  );
}

interface EditorContentProps {
  textareaRef: Ref<HTMLTextAreaElement>;
  message: MessageDto;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleCancelEdit: () => void;
  submitEdit: () => void;
  onAttachmentClick: (index: number) => void;
}

function EditorContent({
  textareaRef,
  message,
  handleInputChange,
  handleKeyDown,
  handleCancelEdit,
  submitEdit,
  onAttachmentClick,
}: EditorContentProps) {
  return (
    <>
      <textarea
        ref={textareaRef}
        rows={1}
        defaultValue={message.body ?? ''}
        onChange={handleInputChange}
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
    </>
  );
}