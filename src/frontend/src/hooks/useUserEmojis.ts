import {useQuery, useQueryClient, type UseQueryResult} from "@tanstack/react-query";
import type {ServerEmojiGroupDto} from "../api/types.ts";
import {sessionUserService} from "../api/sessionUserService.ts";
import {queryClient} from "../main.tsx";
import useSignalREvent from "./useSignalREvent.ts";
import type {EmojiDeletedEvent} from "../api/events.ts";

export default function useUserEmojis(): UseQueryResult<ServerEmojiGroupDto[]> {
  const queryClient = useQueryClient();

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

  const { data, isSuccess } = queryResult;

  useSignalREvent("EmojiDeleted", (event: EmojiDeletedEvent) => {
    if (!isSuccess || !data) return;

    queryClient.setQueryData<ServerEmojiGroupDto[]>(
      useUserEmojis.queryKey,
      (oldData) => {
        if (!oldData) return oldData;

        const index = oldData.findIndex(g => g.serverInfo.serverId === event.serverId);
        if (index === -1) return oldData;

        const updatedData = [...oldData];
        updatedData[index] = {
          ...updatedData[index],
          emojiEntries: updatedData[index].emojiEntries.filter(entry => !event.emojiIds.includes(entry.id)),
        }

        return updatedData;
      }
    );
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