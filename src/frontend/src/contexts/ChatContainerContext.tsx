import {createContext, type ReactNode, useContext} from "react";
import type {MessageInput} from "../components/ChatInput.tsx";
import type {TimelineMessageDto} from "../api/types.ts";

interface ChatContainerContextType {
  channelId: string;
  replyingMessage?: TimelineMessageDto;
  onSendMessage: (messageInput: MessageInput) => void;
  onMessageEdit: (originalMessage: TimelineMessageDto, newBody: string | null) => void;
  onMessageDelete: (originalMessage: TimelineMessageDto) => void;
  onMessageReplyRequested: (message: TimelineMessageDto) => void;
  onCancelMessageReply: () => void;
}

const ChatContainerContext = createContext<ChatContainerContextType | null>(null);

interface ChatContainerContextProviderProps extends ChatContainerContextType {
  children: ReactNode;
}

export default function ChatContainerContextProvider({
  children,
  ...props
}: ChatContainerContextProviderProps) {
  return (
    <ChatContainerContext.Provider value={props}>
      {children}
    </ChatContainerContext.Provider>
  )
}

export const useChatContainerContext = () => {
  const context = useContext(ChatContainerContext);
  if (!context) throw new Error("useChatContainerContext must be used within an ChatContainerContextProvider.");

  return context;
}