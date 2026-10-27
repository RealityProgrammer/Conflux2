import {useQuery, type UseQueryResult} from "@tanstack/react-query";
import type {ServerEmojiGroupDto} from "../api/types.ts";
import {sessionUserService} from "../api/sessionUserService.ts";
import {queryClient} from "../main.tsx";

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

export function findMatchingEmoji(identifier: string) {
  // Synchronously grab cached data from React Query
  const emojiGroups = queryClient.getQueryData<ServerEmojiGroupDto[]>(
    useUserEmojis.queryKey
  );
  if (!emojiGroups) return null;

  for (const group of emojiGroups) {
    const emojis = group.emojiEntries;

    const matched = emojis.find(
      (emoji) => emoji.id === identifier || emoji.shortCode === identifier
    );

    if (matched) {
      return matched;
    }
  }

  return null;
}