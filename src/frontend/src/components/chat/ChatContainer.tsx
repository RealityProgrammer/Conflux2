import {ChatView} from "./ChatView.tsx";
import ChatInput from "./ChatInput.tsx";
import ChatContainerContextProvider from "../../contexts/ChatContainerContext.tsx";

export interface ChatContainerProps {
  conversationId: string;
}

export default function ChatContainer({conversationId}: ChatContainerProps) {
  return (
    <ChatContainerContextProvider
      conversationId={conversationId}
    >
      <div className="flex flex-col flex-1">
        <ChatView/>
        <ChatInput/>
      </div>
    </ChatContainerContextProvider>
  );
}

