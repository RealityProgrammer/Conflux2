import type {ServiceResponse, UserIdentityProfileDto} from "../api/responses.ts";
import {useQuery, useQueryClient, type UseQueryResult} from "@tanstack/react-query";
import {userService} from "../api/userService.ts";

export const useUserBasicProfile = (
  userId: string
): UseQueryResult<ServiceResponse<UserIdentityProfileDto>> => {
  return useQuery({
    queryKey: ['userProfile', 'basic', userId],
    queryFn: () => userService.getUserIdentityProfile(userId),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useFetchUserBasicProfile = () => {
  const queryClient = useQueryClient();

  return async (userId: string): Promise<ServiceResponse<UserIdentityProfileDto>> => {
    if (!userId) throw new Error('userId is required');

    const queryKey = ['userProfile', 'basic', userId];

    const cached = queryClient.getQueryData<ServiceResponse<UserIdentityProfileDto>>(queryKey);
    if (cached) return cached;

    return queryClient.fetchQuery({
      queryKey,
      queryFn: () => userService.getUserIdentityProfile(userId),
      staleTime: 15 * 60 * 1000,
    });
  };
};