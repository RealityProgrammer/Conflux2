import type {
    BackendResponse,
    DiscoverFriendsResponse,
    SendFriendRequestResponse,
    ServiceResponse
} from "./responses.ts";
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

    sendFriendRequest: async (toUser: string): Promise<ServiceResponse<SendFriendRequestResponse>> => {
        try {
            const response: AxiosResponse<BackendResponse<SendFriendRequestResponse>> =
                await apiClient.post<BackendResponse<SendFriendRequestResponse>>(`/friend/requests/${encodeURIComponent(toUser)}`);

            return {
                success: true,
                statusCode: response.status,
                data: response.data!.data,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse<SendFriendRequestResponse>>;
            return handleAxiosError(axiosError);
        }
    },

    acceptFriendRequest: async (toUser: string): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.post<BackendResponse>(`/friend/requests/${encodeURIComponent(toUser)}/accept`);

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<ServiceResponse>;
            return handleAxiosError(axiosError);
        }
    },

    cancelFriendRequest: async (toUser: string): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.post<BackendResponse>(`/friend/requests/${encodeURIComponent(toUser)}/cancel`);

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<ServiceResponse>;
            return handleAxiosError(axiosError);
        }
    },
}