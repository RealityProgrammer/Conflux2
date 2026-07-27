import type {
    BackendResponse, DiscoverFriendElement,
    PaginatedResponse, QueryFriendElement,
    SendFriendRequestResponse,
    ServiceResponse
} from "./responses.ts";
import type {AxiosError, AxiosResponse} from "axios";
import apiClient from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const friendService = {
    discover: async (name: string | null, offset: number, count: number): Promise<ServiceResponse<PaginatedResponse<DiscoverFriendElement>>> => {
        try {
            const searchParams = new URLSearchParams();

            if (name) {
                searchParams.append("name", name);
            }

            searchParams.append("offset", String(offset));
            searchParams.append("count", String(count));

            const response: AxiosResponse<BackendResponse<PaginatedResponse<DiscoverFriendElement>>> =
                await apiClient.get<BackendResponse<PaginatedResponse<DiscoverFriendElement>>>(`/friend/discover?${searchParams.toString()}`);

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

    sendFriendRequest: async (receiverUserId: string): Promise<ServiceResponse<SendFriendRequestResponse>> => {
        try {
            const response: AxiosResponse<BackendResponse<SendFriendRequestResponse>> =
                await apiClient.post<BackendResponse<SendFriendRequestResponse>>(`/friend/requests/${encodeURIComponent(receiverUserId)}`);

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

    acceptFriendRequest: async (senderUserId: string): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.post<BackendResponse>(`/friend/requests/${encodeURIComponent(senderUserId)}/accept`);

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<ServiceResponse>;
            return handleAxiosError(axiosError);
        }
    },

    rejectFriendRequest: async (senderUserId: string): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.post<BackendResponse>(`/friend/requests/${encodeURIComponent(senderUserId)}/reject`);

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<ServiceResponse>;
            return handleAxiosError(axiosError);
        }
    },

    cancelFriendRequest: async (receiverUserId: string): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.post<BackendResponse>(`/friend/requests/${encodeURIComponent(receiverUserId)}/cancel`);

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<ServiceResponse>;
            return handleAxiosError(axiosError);
        }
    },

    unfriend: async (userId: string): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.post<BackendResponse>(`/friend/unfriend/${encodeURIComponent(userId)}`);

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<ServiceResponse>;
            return handleAxiosError(axiosError);
        }
    },

    queryFriends: async (name: string | null, offset: number, count: number) : Promise<ServiceResponse<PaginatedResponse<QueryFriendElement>>> => {
        try {
            const searchParams = new URLSearchParams();

            if (name) {
                searchParams.append("name", name);
            }

            searchParams.append("offset", String(offset));
            searchParams.append("count", String(count));

            const response: AxiosResponse<BackendResponse<PaginatedResponse<QueryFriendElement>>> =
                await apiClient.get<BackendResponse<PaginatedResponse<QueryFriendElement>>>(`/friend/friends?${searchParams.toString()}`);

            return {
                success: true,
                statusCode: response.status,
                data: response.data.data,
            }
        } catch (error) {
            const axiosError = error as AxiosError<ServiceResponse>;
            return handleAxiosError(axiosError);
        }
    },
}