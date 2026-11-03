import {useQuery, type UseQueryOptions} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";
import type {DmConversationDetails} from "../api/types.ts";

export default function useQueryDmConversationDetails(
  peerId: string,
  options: Omit<UseQueryOptions<DmConversationDetails>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: useQueryDmConversationDetails.getKey(peerId),
    queryFn: async () => {
      return await conversationService.getDmConversationDetails(peerId);
    },
    ...options,
  });
}

useQueryDmConversationDetails.getKey = (peerId: string) => ["useQueryDmConversationDetails", peerId];