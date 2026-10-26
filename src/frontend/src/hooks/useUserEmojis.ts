import {useQuery, type UseQueryResult} from "@tanstack/react-query";
import type {ServerEmojiGroupDto} from "../api/types.ts";
import {sessionUserService} from "../api/sessionUserService.ts";

export default function useUserEmojis(): UseQueryResult<ServerEmojiGroupDto[]> {
  const queryResult = useQuery({
    queryKey: useUserEmojis.queryKey,
    queryFn: async (): Promise<ServerEmojiGroupDto[]> => {
      const response = await sessionUserService.getEmojiEntryGroups();

      if (!response.success || !response.data) {
        console.log("Failed to fetch user emojis.");
        throw new Error('Failed to fetch user server emojis');
      }

      return response.data!;
    },
    staleTime: 60 * 60 * 1000,  // 1 hour stale time
    refetchOnWindowFocus: false,
  });

  return queryResult;
}

useUserEmojis.queryKey = ["UserEmojis"];