import IconButton from "./IconButton.tsx";
import {BsCameraVideo, BsMusicNote, BsPaperclip, BsSend, BsTrash, BsX} from "react-icons/bs";
import {type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState} from "react";
import {ScrollArea} from "radix-ui";
import type {MessageDto} from "../api/responses.ts";
import {useChatContainerContext} from "../contexts/ChatContainerContext.tsx";
import MediaPreviewGallery from "./MediaPreviewGallery.tsx";

export interface ChatInputProps {
  disabled?: boolean;
}

export type MessageInput = {
  messageBody: string;
  attachments: File[];
  replyingMessage?: MessageDto | undefined;
}

export interface AttachmentThumbnailProps {
  file: File;
  previewUrl?: string;
  onRemove: () => void;
  onClick: () => void;
}

type AttachmentItem = {
  id: string;
  file: File;
  previewUrl?: string;
}

export default function ChatInput({disabled}: ChatInputProps) {
  const {replyingMessage, onSendMessage, onCancelMessageReply} = useChatContainerContext()!;

  const [messageBody, setMessageBody] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSendable: boolean = !disabled && (messageBody.trim().length > 0 || attachments.length > 0);

  const handleAttachmentButtonClick = () => {
    if (!fileInputRef.current) {
      return;
    }

    fileInputRef.current.click();
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessageBody(e.target.value);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // reset height to recalculate true scrollHeight
      textarea.style.height = `${textarea.scrollHeight}px`; // Expand to fit text
    }
  };

  const handleAttachmentChanged = (e: ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || !files.length) {
      return;
    }

    const newAttachments = Array.from(files).map<AttachmentItem>(file => {
      const objectURL = URL.createObjectURL(file);

      return {
        file,
        id: crypto.randomUUID(),
        previewUrl: objectURL,
      };
    });

    setAttachments([...attachments, ...newAttachments]);
    e.target.value = '';    // reset so that same file can be selected again (for some reason lmao)
  };

  const attachmentsRef = useRef<AttachmentItem[]>([]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const handleRemoveAttachment = (id: string): void => {
    setAttachments((prev) => {
      const toRemove = prev.find(item => item.id === id);

      if (toRemove?.previewUrl) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }

      return prev.filter(item => item.id !== id);
    });
  };

  const handleSendMessage = () => {
    if (!isSendable) return;

    onSendMessage?.({
      messageBody: messageBody,
      attachments: attachments.map(attachment => attachment.file),
      replyingMessage: replyingMessage,
    });

    attachments.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    setMessageBody("");
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // gallery states
  const [previewGalleryState, setPreviewGalleryState] = useState({open: false, index: 0});

  const safeIndex = Math.min(
    Math.max(0, previewGalleryState.index),
    Math.max(0, attachments.length - 1)
  );
  const activeAttachment = attachments[safeIndex];

  return (
    <footer className="flex-none px-2 py-1 border-t-2 border-t-gray-600 flex flex-col gap-2 text-white">
      {replyingMessage && (
        <section className="flex flex-col min-w-0">
          <div className="flex flex-row gap-2 mb-1">
            <p className="text-sm flex-1">Replying to:</p>

            <IconButton isLoading={false} theme="default" className="ml-auto flex-none" onClick={onCancelMessageReply}>
              <BsX className="size-5 cursor-pointer"/>
            </IconButton>
          </div>

          {/* https://stackoverflow.com/a/79634869 */}
          {replyingMessage.body && (
            <p className="min-w-0 overflow-hidden text-sm bg-white/5 px-2 py-1 rounded-md border border-gray-600">
              <span className="line-clamp-2 break-all">{replyingMessage.body}</span>
            </p>
          )}

          {replyingMessage.attachments && replyingMessage.attachments.length > 0 && (
            <span className="text-sm">{replyingMessage.attachments.length} attachment{replyingMessage.attachments.length > 1 ? 's' : ''}</span>
          )}
        </section>
      )}

      {attachments.length > 0 && (
        <section>
          <ScrollArea.Root className="h-20 w-full overflow-hidden">
            <ScrollArea.Viewport className="size-full">
              <div className="flex flex-row gap-2 w-max h-20 pr-4 pb-3">
                {attachments.map((item, index) => (
                  <AttachmentThumbnail
                    key={item.id}
                    file={item.file}
                    onRemove={() => handleRemoveAttachment(item.id)}
                    previewUrl={item.previewUrl}
                    onClick={() => {
                      setPreviewGalleryState({
                        open: true,
                        index,
                      });
                    }}
                  />
                ))}
              </div>
            </ScrollArea.Viewport>

            <ScrollArea.Scrollbar
              className="flex flex-col h-2 touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight"
              orientation="horizontal"
            >
              <ScrollArea.Thumb
                className="relative flex-1 rounded-[10px] bg-gray-400 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2"/>
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          <MediaPreviewGallery
            open={previewGalleryState.open}
            onOpenChange={(state) => {
              if (!state) {
                setPreviewGalleryState((prev) => ({...prev, open: false,}));
              }
            }}
            currentItem={{
              source: activeAttachment.previewUrl!,
              type: activeAttachment.file.type,
            }}
            hasPreviousItem={previewGalleryState.index > 0}
            onPrevious={() => {
              setPreviewGalleryState((prev) => ({
                ...prev,
                index: prev.index - 1
              }));
            }}
            hasNextItem={previewGalleryState.index < attachments.length - 1}
            onNext={() => {
              setPreviewGalleryState((prev) => ({
                ...prev,
                index: prev.index + 1
              }));
            }}
          />
        </section>
      )}

      <section className="flex flex-row items-end gap-2">
        <input ref={fileInputRef}
               type="file"
               accept="image/jpeg, image/png, image/gif, audio/ogg, audio/wav, audio/mp4, audio/mpeg, audio/vorbis, video/H263, video/H264, video/H265, video/mp4, video/ogg"
               multiple
               hidden
               onChange={handleAttachmentChanged}
        />

        <IconButton isLoading={false} className="size-6 flex-none mb-2" disabled={disabled}
                    onClick={handleAttachmentButtonClick}>
          <BsPaperclip className="size-6"/>
        </IconButton>

        <textarea ref={textareaRef}
                  rows={1}
                  value={messageBody}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="Message body goes here"
                  disabled={disabled}
                  maxLength={1024}
                  className="input-field min-h-10 max-h-36 w-full flex-1 text-sm resize-none py-2 px-3 overflow-y-auto leading-relaxed"
        />

        <IconButton isLoading={false} className="size-6 flex-none mb-2" disabled={!isSendable}
                    onClick={handleSendMessage}>
          <BsSend className="size-6"/>
        </IconButton>
      </section>
    </footer>
  );
}

function AttachmentThumbnail({file, previewUrl, onRemove, onClick}: AttachmentThumbnailProps) {
  return (
    <div
      className={`flex-none overflow-hidden h-full aspect-square rounded-md relative group ${file.type.startsWith('image/') ? "" : "border border-gray-500 hover:border-gray-400 transition-colors duration-200"}`}>
      {file.type.startsWith("image") && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          onClick={onClick}
          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
        />
      ) : file.type.startsWith("video") ? (
        <div className="size-full flex flex-row justify-center items-center cursor-pointer" onClick={onClick}>
          <BsCameraVideo className="size-6 fill-white"/>
        </div>
      ) : file.type.startsWith("audio") ? (
        <div className="size-full flex flex-row justify-center items-center cursor-pointer" onClick={onClick}>
          <BsMusicNote className="size-6 fill-white"/>
        </div>
      ) : (
        <div
          onClick={onClick}
          className="w-full h-full flex flex-col items-center justify-center p-2 text-xs text-center text-gray-300 bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors"
        >
          <span className="truncate w-full font-medium">{file.name}</span>
        </div>
      )}

      <IconButton isLoading={false} theme="danger"
                  className="size-6 absolute top-0 right-0 rounded-md invisible group-hover:visible"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
      >
        <BsTrash className="size-5"/>
      </IconButton>
    </div>
  );
}
