import {createContext, type ReactNode, useContext} from "react";
import type {MessageInput} from "../components/ChatInput.tsx";
import type {MessageDto} from "../api/responses.ts";

interface ChatContainerContextType {
    channelId: string;
    replyingMessage?: MessageDto;
    onSendMessage: (messageInput: MessageInput) => void;
    onMessageEdit: (originalMessage: MessageDto, newBody: string | null) => void;
    onMessageDelete: (originalMessage: MessageDto) => void;
    onMessageReplyRequested: (message: MessageDto) => void;
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

export const useChatContainerContext = () => useContext(ChatContainerContext);