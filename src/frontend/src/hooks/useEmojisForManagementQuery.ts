import {useQuery, type UseQueryResult} from "@tanstack/react-query"
import {communityServerService} from "../api/communityServerService.ts";
import type {EmojiManagementDto, ServiceResponse} from "../api/types.ts";

export default function useEmojisForManagementQuery(serverId: string): UseQueryResult<EmojiManagementDto[], Error> {
  return useQuery({
    queryKey: useEmojisForManagementQuery.getKey(serverId),
    queryFn: async () => {
      const response: ServiceResponse<EmojiManagementDto[]> =
        await communityServerService.getEmojisForManagement(serverId);

      if (!response.success) {
        throw new Error(response.error!.message!);
      }

      return response.data!;
    },
  });
}

useEmojisForManagementQuery.getKey = (serverId: string) => ["EmojisForManagementQuery", serverId];