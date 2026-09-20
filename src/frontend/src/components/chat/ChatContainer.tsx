import {ChatView} from "./ChatView.tsx";
import ChatInput from "./ChatInput.tsx";
import ChatContainerContextProvider from "../../contexts/ChatContainerContext.tsx";

export interface ChatContainerProps {
  channelId: string;
}

export default function ChatContainer({channelId}: ChatContainerProps) {
  return (
    <ChatContainerContextProvider
      channelId={channelId}
    >
      <div className="flex flex-col flex-1">
        <ChatView/>
        <ChatInput/>
      </div>
    </ChatContainerContextProvider>
  );
}

