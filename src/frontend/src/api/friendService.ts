import type {BackendResponse, DiscoverFriendsResponse, ServiceResponse} from "./responses.ts";
import type {AxiosError, AxiosResponse} from "axios";
import apiClient from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const friendService = {
    discover: async (name: string | null, offset: number, count: number): Promise<ServiceResponse<DiscoverFriendsResponse>> => {
        try {
            const searchParams = new URLSearchParams();

            if (name) {
                searchParams.append("name", name);
            }

            searchParams.append("offset", String(offset));
            searchParams.append("count", String(count));

            const response: AxiosResponse<BackendResponse<DiscoverFriendsResponse>> =
                await apiClient.get<BackendResponse<DiscoverFriendsResponse>>(`/friend/discover?${searchParams.toString()}`);

            return {
                success: true,
                statusCode: response.status,
                data: response.data!.data,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },
}