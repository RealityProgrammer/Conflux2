import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { serverService } from "../api/serverService.ts";
import type { EmojiManagementDto, ServiceResponse } from "../api/types.ts";

export default function useQueryEmojisForManagement(
  serverId: string,
): UseQueryResult<EmojiManagementDto[], Error> {
  return useQuery({
    queryKey: useQueryEmojisForManagement.getKey(serverId),
    queryFn: async () => {
      const response: ServiceResponse<EmojiManagementDto[]> =
        await serverService.getEmojisForManagement(serverId);

      if (!response.success) {
        throw new Error(response.error!.message!);
      }

      return response.data!;
    },
  });
}

useQueryEmojisForManagement.getKey = (serverId: string) => [
  "useQueryEmojisForManagement",
  serverId,
];
