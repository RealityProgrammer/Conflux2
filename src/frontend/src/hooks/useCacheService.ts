import {useQueryClient} from "@tanstack/react-query";
import {userService} from "../api/userService.ts";
import type {ServiceResponse, UserBasicProfileSummary} from "../api/responses.ts";

interface UseCacheServiceResult {
    fetchUserBasicProfile: (userId: string, staleTime?: number) => Promise<ServiceResponse<UserBasicProfileSummary>>;
}

export const useCacheService = (): UseCacheServiceResult => {
    const queryClient = useQueryClient();

    const fetchUserBasicProfile = async (userId: string, staleTime?: number) => {
        return await queryClient.fetchQuery({
            queryKey: ["userProfile", userId],
            queryFn: () => userService.getUserBasicProfile(userId),
            staleTime: staleTime || 900,
        });
    };

    return { fetchUserBasicProfile };
}