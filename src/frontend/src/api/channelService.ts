import type {
    BackendResponse,
    DirectMessageChannelSummary,
    DirectMessageResolutionResponse,
    ServiceResponse
} from "./responses.ts";
import apiClient from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import type {AxiosError, AxiosResponse} from "axios";

export const channelService = {
    getDirectMessageChannelSummary: async (channelId: string): Promise<ServiceResponse<DirectMessageChannelSummary>> => {
        try {
            const response: AxiosResponse<BackendResponse<DirectMessageChannelSummary>> =
                await apiClient.get<BackendResponse<DirectMessageChannelSummary>>(
                    `/channels/dm/${encodeURIComponent(channelId)}/summary`
                );

            return {
                success: true,
                statusCode: response.status,
                data: response.data.data,
            };
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse<DirectMessageChannelSummary>>;
            return handleAxiosError(axiosError);
        }
    },

    getDirectMessageChannelId: async (toUserId: string): Promise<ServiceResponse<string>> => {
        try {
            const response: AxiosResponse<BackendResponse<DirectMessageResolutionResponse>> =
                await apiClient.post<BackendResponse<DirectMessageResolutionResponse>>(
                    `/channels/dm/${encodeURIComponent(toUserId)}`
                );

            return {
                success: true,
                statusCode: response.status,
                data: response.data.data?.channelId,
            };
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse<DirectMessageResolutionResponse>>;
            return handleAxiosError(axiosError);
        }
    }
};