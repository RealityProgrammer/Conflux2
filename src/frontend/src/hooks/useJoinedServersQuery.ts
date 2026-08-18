import {type InfiniteData, useInfiniteQuery, type UseInfiniteQueryResult} from "@tanstack/react-query";
import type {GetJoinedCommunityServerQuery} from "../gql/graphql.ts";
import type {ServiceResponse} from "../api/responses.ts";
import {sessionUserService} from "../api/sessionUserService.ts";

export interface UseJoinedServersQueryResult {
  queryKey: string[];
  queryResult: UseInfiniteQueryResult<InfiniteData<GetJoinedCommunityServerQuery['joinedServers'] | null>>;
  allElements: { id: string, name: string, hasAvatar: boolean }[];
}

export default function useJoinedServersQuery(): UseJoinedServersQueryResult {
  const queryKey = ["joinedCommunityServers"];

  const queryResult = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({pageParam}): Promise<GetJoinedCommunityServerQuery['joinedServers'] | null> => {
      const response: ServiceResponse<GetJoinedCommunityServerQuery['joinedServers'] | null> =
        await sessionUserService.getJoinedCommunityServers(pageParam);

      if (!response.data) {
        throw new Error("Failed to fetch joined community servers.");
      }

      return response.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return null;

      if (!lastPage.pageInfo.hasNextPage) {
        return null;
      }

      return lastPage.pageInfo.endCursor;
    },
    staleTime: 30 * 60 * 1000,
  });

  const allElements = queryResult.data?.pages.flatMap((page) => page?.nodes ?? []) ?? [];

  return { queryKey, queryResult, allElements };
}