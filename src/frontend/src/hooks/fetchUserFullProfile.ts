import type {ServiceResponse, UserFullProfileDto} from "../api/responses.ts";
import {useQuery, useQueryClient, type UseQueryResult} from "@tanstack/react-query";
import {userService} from "../api/userService.ts";

export const useUserFullProfile = (
  userId: string
): UseQueryResult<ServiceResponse<UserFullProfileDto>> => {
  return useQuery({
    queryKey: ['userProfile', 'full', userId],
    queryFn: () => userService.getUserFullProfile(userId),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useFetchUserFullProfile = () => {
  const queryClient = useQueryClient();

  return async (userId: string): Promise<ServiceResponse<UserFullProfileDto>> => {
    if (!userId) throw new Error('userId is required');

    const queryKey = ['userProfile', 'full', userId];

    const cached = queryClient.getQueryData<ServiceResponse<UserFullProfileDto>>(queryKey);
    if (cached) return cached;

    return queryClient.fetchQuery({
      queryKey,
      queryFn: () => userService.getUserFullProfile(userId),
      staleTime: 15 * 60 * 1000,
    });
  };
};