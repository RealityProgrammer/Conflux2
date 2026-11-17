import { createContext, type ReactNode, useContext } from "react";
import type {
  DmConversationDetails,
  ServerChannelConversationDetails,
} from "../api/types.ts";
import useQueryDmConversationDetails from "../hooks/useQueryDmConversationDetails.ts";
import useQueryServerChannelConversationDetails from "../hooks/useQueryServerChannelConversationDetails.ts";

export type ConversationSource =
  | { type: "dm"; peerId: string }
  | { type: "server-channel"; serverId: string; channelId: string }
  | { type: "invalid" };

interface ConversationContextType {
  source: ConversationSource;
  detailsQuery:
    | {
        data:
          DmConversationDetails | ServerChannelConversationDetails | undefined;
        isLoading: boolean;
        isError: boolean;
        isSuccess: boolean;
      }
    | undefined;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export default function ConversationContextProvider({
  source,
  children,
}: {
  source: ConversationSource;
  children: ReactNode;
}) {
  const {
    data: dmDetails,
    isLoading: isLoading1,
    isError: isError1,
    isSuccess: isSuccess1,
  } = useQueryDmConversationDetails(source.type === "dm" ? source.peerId : "", {
    enabled: source.type === "dm",
    retry: 2,
    staleTime: 30 * 60 * 1000,
  });

  const {
    data: channelDetails,
    isLoading: isLoading2,
    isError: isError2,
    isSuccess: isSuccess2,
  } = useQueryServerChannelConversationDetails(
    source.type === "server-channel"
      ? { serverId: source.serverId, channelId: source.channelId }
      : { serverId: "???", channelId: "???" },
    {
      enabled: source.type === "server-channel",
      retry: 2,
      staleTime: 30 * 60 * 1000,
    },
  );

  return (
    <ConversationContext.Provider
      value={{
        source,
        detailsQuery:
          source.type === "dm"
            ? {
                data: dmDetails,
                isLoading: isLoading1,
                isError: isError1,
                isSuccess: isSuccess1,
              }
            : source.type === "server-channel"
              ? {
                  data: channelDetails,
                  isLoading: isLoading2,
                  isError: isError2,
                  isSuccess: isSuccess2,
                }
              : undefined,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationContext(): ConversationContextType {
  const context = useContext(ConversationContext);
  if (!context)
    throw new Error(
      "useConversationContext must be used within a ConversationContextProvider.",
    );

  return context;
}
