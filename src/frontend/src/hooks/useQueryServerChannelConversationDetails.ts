import {useQuery, type UseQueryOptions} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";
import type {ServerChannelConversationDetails} from "../api/types.ts";

export interface UseQueryServerChannelConversationDetails {
  serverId: string;
  channelId: string;
}

export default function useQueryServerChannelConversationDetails(
  variables: UseQueryServerChannelConversationDetails,
  options: Omit<UseQueryOptions<ServerChannelConversationDetails>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: useQueryServerChannelConversationDetails.getKey(variables.serverId, variables.channelId),
    queryFn: async () => {
      return await conversationService.getServerChannelConversationDetails(variables.serverId, variables.channelId);
    },
    ...options,
  });
}

useQueryServerChannelConversationDetails.getKey = (serverId: string, channelId: string) => ["useQueryDmConversationDetails", serverId, channelId];