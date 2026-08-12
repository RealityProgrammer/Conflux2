import type {DmChannelSummary, ServiceResponse} from "../api/responses.ts";
import {useQuery, useQueryClient, type UseQueryResult} from "@tanstack/react-query";
import {channelService} from "../api/channelService.ts";

export const useDmChannelSummary = (
  channelId: string
): UseQueryResult<ServiceResponse<DmChannelSummary>> => {
  return useQuery({
    queryKey: ['dmChannelSummary', channelId],
    queryFn: () => channelService.getDmChannelSummary(channelId),
    enabled: !!channelId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useFetchDmChannelSummary = () => {
  const queryClient = useQueryClient();

  return async (channelId: string): Promise<ServiceResponse<DmChannelSummary>> => {
    if (!channelId) throw new Error('userId is required');

    const queryKey = ['dmChannelSummary', channelId];

    const cached = queryClient.getQueryData<ServiceResponse<DmChannelSummary>>(queryKey);
    if (cached) return cached;

    return queryClient.fetchQuery({
      queryKey,
      queryFn: () => channelService.getDmChannelSummary(channelId),
      staleTime: 15 * 60 * 1000,
    });
  };
};