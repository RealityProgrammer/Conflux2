import {useQueryClient} from "@tanstack/react-query";
import {userService} from "../api/userService.ts";
import type {ServiceResponse, UserBasicProfileSummary} from "../api/responses.ts";

interface UseCacheServiceResult {
    getUserBasicProfile: (userId: string, staleTime?: number) => Promise<ServiceResponse<UserBasicProfileSummary>>;
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

    return { getUserBasicProfile };
}
