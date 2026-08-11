import {useQueryClient} from "@tanstack/react-query";
import {userService} from "../api/userService.ts";
import type {DmChannelSummary, ServiceResponse, UserBasicProfileDto} from "../api/responses.ts";
import {channelService} from "../api/channelService.ts";

interface UseCacheServiceResult {
    getUserBasicProfile: (userId: string, staleTime?: number) => Promise<ServiceResponse<UserBasicProfileDto>>;
    getDmChannelSummary: (channelId: string) => Promise<ServiceResponse<DmChannelSummary>>;
}

export const useCacheService = (): UseCacheServiceResult => {
    const queryClient = useQueryClient();

    const getUserBasicProfile = async (userId: string, staleTime?: number) => {
        return await queryClient.fetchQuery({
            queryKey: ["userProfile", userId],
            queryFn: () => userService.getUserBasicProfile(userId),
            staleTime: staleTime || 900,
        });
    };

    const getDmChannelSummary = async (channelId: string, staleTime?: number) => {
        return await queryClient.fetchQuery({
            queryKey: ["dmChannelSummary", channelId],
            queryFn: () => channelService.getDmChannelSummary(channelId),
            staleTime: staleTime || 900,
        });
    };

    return { getUserBasicProfile, getDmChannelSummary };
}
