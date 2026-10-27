import IconButton from "../IconButton.tsx";
import {BsCameraVideo, BsMusicNote, BsPaperclip, BsSend, BsTrash, BsX} from "react-icons/bs";
import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState
} from "react";
import {ScrollArea} from "radix-ui";
import type {TimelineMessageDto} from "../../api/types.ts";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import {useTypingEmitter} from "../../hooks/useTypingEmitter.ts";
import {useMediaGalleryStore} from "../../store/useMediaGalleryStore.ts";
import {Suggestion} from "./Suggestion.tsx";
import MessageTextboxEditor, {type MessageTextboxEditorRef, type SuggestionData} from "./MessageTextboxEditor.tsx";

export interface ChatInputProps {
  disabled?: boolean;
}

export type MessageInput = {
  messageBody: string;
  attachments: File[];
  replyingMessage: TimelineMessageDto | null;
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
  const {conversationId, replyingMessage, handleSendMessage, setReplyingMessage} = useChatContainerContext();

  const textboxEditorRef = useRef<MessageTextboxEditorRef | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messageBody, setMessageBody] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  const [suggestion, setSuggestion] = useState<SuggestionData | undefined>(undefined);

  useEffect(() => {
    console.log("suggestion:", suggestion);
  }, [suggestion]);

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
    setAttachments((prev: AttachmentItem[]) => {
      const toRemove = prev.find(item => item.id === id);

      if (toRemove?.previewUrl) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }

      return prev.filter(item => item.id !== id);
    });
  };

  const isSendable: boolean = !disabled && (messageBody.trim().length > 0 || attachments.length > 0);

  const handleSend = () => {
    if (!isSendable || !textboxEditorRef.current) return;

    handleSendMessage?.({
      messageBody: messageBody,
      attachments: attachments.map(attachment => attachment.file),
      replyingMessage: replyingMessage,
    });

    attachments.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    textboxEditorRef.current.reset();
    setMessageBody("");
    setAttachments([]);
  };

  const setGalleryElements = useMediaGalleryStore(state => state.setElements);

  return (
    <footer className="relative flex-none px-2 py-1 border-t-2 border-t-gray-600 flex flex-col gap-2 text-white">
      {suggestion && (
        <>
          {suggestion.type === "mode" ? (
            <Suggestion.Mode
              className="z-10 absolute bottom-full -translate-y-2 inset-x-2 shadow-xl"
              onSelect={(mode) => {
                // cursor is after the start colon, insert the mode directly
                textboxEditorRef.current?.insertText(mode, suggestion.startColonIndex + 1, cursorPosition);
              }}
            />
          ) : suggestion.type === "emoji" ? (
            <Suggestion.Emoji
              className="z-10 absolute bottom-full -translate-y-2 inset-x-2 shadow-xl"
              searchTerm={suggestion.searchTerm ?? ""}
              onSelect={(emojiId) => {
                // replace from the starting colon with the full formatted emoji tag and a trailing space
                textboxEditorRef.current?.insertEmojiNode(emojiId, suggestion.startColonIndex, cursorPosition);
              }}
            />
          ) : suggestion.type === "time" ? (
            <Suggestion.Time
              className="z-10 absolute bottom-full -translate-y-2 inset-x-2 shadow-xl"
              onSelectSystemTime={() => {
                // replace from the starting colon with the formatted timestamp tag and a trailing space
                textboxEditorRef.current?.insertText(`:t${new Date().getTime()}: `, suggestion.startColonIndex, cursorPosition);
              }}
            />
          ) : (
            <Suggestion.Unknown
              className="z-10 absolute bottom-full -translate-y-2 inset-x-2 shadow-xl"
            />
          )}
        </>
      )}

      {replyingMessage && (
        <section className="flex flex-col min-w-0">
          <div className="flex flex-row gap-2 mb-1">
            <p className="text-sm flex-1">Replying to:</p>

            <IconButton isLoading={false} theme="default" className="ml-auto flex-none" onClick={() => setReplyingMessage(null)}>
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
        <ScrollArea.Root className="h-32 w-full overflow-hidden">
          <ScrollArea.Viewport className="size-full min-h-0">
            <div className="flex flex-row gap-2 w-max h-32 pr-4 pb-3">
              {attachments.map((item, index) => (
                <AttachmentThumbnail
                  key={item.id}
                  file={item.file}
                  onRemove={() => handleRemoveAttachment(item.id)}
                  previewUrl={item.previewUrl}
                  onClick={() => {
                    setGalleryElements(attachments.map(attachment => ({
                      id: attachment.id,
                      fileName: attachment.file.name,
                      mediaType: attachment.file.type,
                      src: attachment.previewUrl!,
                    })), index);
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
      )}

      <section className="flex flex-row items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg, image/png, image/gif, audio/ogg, audio/wav, audio/mp4, audio/mpeg, audio/vorbis, video/H263, video/H264, video/H265, video/mp4, video/ogg"
          multiple
          hidden
          onChange={handleAttachmentChanged}
        />

        <IconButton
          className="flex-none mb-2"
          disabled={disabled}
          onClick={handleAttachmentButtonClick}
        >
          <BsPaperclip className="size-6"/>
        </IconButton>

        <MessageTextboxEditor
          ref={textboxEditorRef}
          onTextChange={handleInput}
          onEnterSend={handleSend}
          onSuggestionChange={setSuggestion}
        />

        <IconButton
          className="flex-none mb-2"
          disabled={!isSendable}
          onClick={handleSend}
        >
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
          className="size-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
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
          className="size-full flex flex-col items-center justify-center p-2 text-xs text-center text-gray-300 bg-gray-800 cursor-pointer hover:bg-gray-700 transition-colors"
        >
          <span className="truncate w-full font-medium">{file.name}</span>
        </div>
      )}

      <IconButton
        isLoading={false} theme="danger"
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