import IconButton from "../IconButton.tsx";
import { BsEmojiWinkFill, BsPaperclip, BsX } from "react-icons/bs";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { ScrollArea } from "radix-ui";
import { useChatContainerContext } from "../../contexts/ChatContainerContext.tsx";
import { useTypingEmitter } from "../../hooks/useTypingEmitter.ts";
import { useMediaGalleryStore } from "../../store/useMediaGalleryStore.ts";
import MessageTextboxEditor, {
  type MessageTextboxEditorRef,
  type SuggestionData,
} from "./MessageTextboxEditor.tsx";
import { FaPaperPlane, FaXmark } from "react-icons/fa6";
import { Attachment } from "./Attachment.tsx";
import MessageAttachmentInput from "./MessageAttachmentInput.tsx";
import { MessageEditorSuggestions } from "./MessageEditorSuggestions.tsx";
import { EmojiPanel } from "./EmojiPanel.tsx";
import { $createEmojiNode } from "./nodes/EmojiDecoratorNode.tsx";
import { $createTextNode } from "lexical";

export interface ChatInputProps {
  disabled?: boolean;
}

export type AttachmentItem = {
  id: string;
  file: File;
  previewUrl?: string;
};

export default function ChatInput({ disabled }: ChatInputProps) {
  const setGalleryElements = useMediaGalleryStore((state) => state.setElements);

  const { conversationId, replyingMessage, handleSendMessage, setReplyingMessage } =
    useChatContainerContext();

  const textboxEditorRef = useRef<MessageTextboxEditorRef | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messageBody, setMessageBody] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);

  const notifyTyping = useTypingEmitter(conversationId);

  const handleAttachmentButtonClick = () => {
    if (!fileInputRef.current) {
      return;
    }

    fileInputRef.current.click();
  };

  const handleInput = (body: string, cursorPosition: number) => {
    setCursorPosition(cursorPosition);

    if (body !== messageBody) {
      setMessageBody(body);
      notifyTyping();
    }
  };

  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const handleAttachmentChanged = (e: ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || !files.length) {
      return;
    }

    const newAttachments = Array.from(files).map<AttachmentItem>((file) => {
      const objectURL = URL.createObjectURL(file);

      return {
        file,
        id: crypto.randomUUID(),
        previewUrl: objectURL,
      };
    });

    setAttachments((prev: AttachmentItem[]): AttachmentItem[] => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const attachmentsRef = useRef<AttachmentItem[]>([]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const handleRemoveAttachment = (id: string): void => {
    setAttachments((prev: AttachmentItem[]) => {
      const toRemove = prev.find((item) => item.id === id);

      if (toRemove?.previewUrl) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const isSendable: boolean = !disabled && (messageBody.trim().length > 0 || attachments.length > 0);

  const handleSend = () => {
    if (!isSendable || !textboxEditorRef.current) return;

    const convertedBody = textboxEditorRef.current.convertToMarkdownString();

    handleSendMessage?.({
      body: convertedBody,
      attachments: attachments.map((attachment) => attachment.file),
      replyingMessageId: replyingMessage?.id ?? null,
    });

    attachments.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    textboxEditorRef.current.reset();
    setMessageBody("");
    setAttachments([]);
  };

  return (
    <footer className="relative flex flex-none flex-col gap-2 border-t-2 border-t-gray-600 px-2 py-1 text-white">
      <MessageEditorSuggestions.Default
        suggestion={suggestion}
        textboxEditorRef={textboxEditorRef}
        cursorPosition={cursorPosition}
      />

      {replyingMessage && (
        <section className="flex min-w-0 flex-col">
          <div className="mb-1 flex flex-row gap-2">
            <p className="flex-1 text-sm">Replying to:</p>

            <IconButton
              isLoading={false}
              theme="default"
              className="ml-auto flex-none"
              onClick={() => setReplyingMessage(null)}
            >
              <BsX className="size-5 cursor-pointer" />
            </IconButton>
          </div>

          {/* https://stackoverflow.com/a/79634869 */}
          {replyingMessage.body && (
            <p className="mt-1 min-w-0 overflow-hidden rounded-md border border-gray-600 bg-white/5 px-2 py-1 text-sm">
              <span className="line-clamp-2 break-all">{replyingMessage.body}</span>
            </p>
          )}

          {replyingMessage.attachments && replyingMessage.attachments.length > 0 && (
            <span className="mt-1 text-sm">
              With {replyingMessage.attachments.length} attachment
              {replyingMessage.attachments.length > 1 ? "s" : ""}
            </span>
          )}
        </section>
      )}

      {attachments.length > 0 && (
        <ScrollArea.Root className="w-full">
          <ScrollArea.Viewport className="size-full">
            <div className="flex flex-row items-center gap-4">
              {attachments.map((attachment, index) => (
                <div key={index} className="relative h-13 shrink-0">
                  <Attachment.FilePill
                    key={index}
                    file={{
                      type: attachment.file.type,
                      src: attachment.previewUrl ?? "",
                      fileName: attachment.file.name,
                    }}
                    className="hover-highlight h-full max-w-64 cursor-pointer overflow-hidden rounded-md border-2 border-gray-600 pr-4"
                    onClick={() => {
                      setGalleryElements(
                        attachments.map((attachment) => ({
                          id: attachment.id,
                          fileName: attachment.file.name,
                          mediaType: attachment.file.type,
                          src: attachment.previewUrl!,
                        })),
                        index,
                        {},
                      );
                    }}
                  />

                  <button
                    className="button-theme-danger absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-gray-600 p-1"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                  >
                    <FaXmark className="size-3 fill-white" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea.Viewport>

          <ScrollArea.Scrollbar
            className="hover-highlight flex h-2 touch-none flex-col p-0.5 transition-colors duration-160 ease-out select-none"
            orientation="horizontal"
          >
            <ScrollArea.Thumb className="relative flex-1 rounded-full bg-gray-400" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      )}

      <section className="flex flex-row items-end gap-2">
        <MessageAttachmentInput ref={fileInputRef} onChange={handleAttachmentChanged} />

        <IconButton className="mb-2 flex-none" disabled={disabled} onClick={handleAttachmentButtonClick}>
          <BsPaperclip className="size-6" />
        </IconButton>

        <MessageTextboxEditor
          ref={textboxEditorRef}
          disabled={disabled}
          onTextChange={handleInput}
          onEnterSend={handleSend}
          onSuggestionChange={setSuggestion}
          onImagePaste={(file) => {
            setAttachments((prev: AttachmentItem[]): AttachmentItem[] => {
              const objectUrl = URL.createObjectURL(file);

              return [...prev, { id: crypto.randomUUID(), file, previewUrl: objectUrl }];
            });
          }}
        />

        <EmojiPanel.StandardPopover
          side="top"
          trigger={
            <IconButton className="mb-2 flex-none" isLoading={false} disabled={disabled}>
              <BsEmojiWinkFill className="size-6" />
            </IconButton>
          }
          contentClassName="emoji-standard-panel"
          onSelect={(emoji) => {
            switch (emoji.type) {
              case "server-emoji":
                textboxEditorRef.current?.insertAtLastSelection(() => $createEmojiNode(emoji.id));
                break;

              case "unicode-emoji":
                textboxEditorRef.current?.insertAtLastSelection(() => $createTextNode(emoji.value));
                break;
            }
          }}
        />

        <IconButton
          className="mb-2 flex-none"
          disabled={!isSendable}
          isLoading={false}
          onClick={handleSend}
        >
          <FaPaperPlane className="size-6" />
        </IconButton>
      </section>
    </footer>
  );
}
