import { type QueryKey, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { userService } from "../api/userService.ts";
import type { FriendSearchResponse } from "../api/types.ts";

export default function useDiscoverFriend(
  searchTerm: string,
  options?: Omit<UseQueryOptions<unknown, Error, FriendSearchResponse>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: useDiscoverFriend.getKey(searchTerm),
    queryFn: async () => {
      return await userService.discoverFriend(searchTerm);
    },
    ...options,
  });
}

useDiscoverFriend.getKey = (searchTerm: string): QueryKey => ["useDiscoverFriend", searchTerm];
