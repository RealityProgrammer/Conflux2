import type {
    BackendResponse,
    DmChannelSummary,
    DirectMessageResolutionResponse,
    ServiceResponse
} from "./responses.ts";
import apiClient from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import type {AxiosError, AxiosResponse} from "axios";

export const channelService = {
    getDmChannelSummary: async (channelId: string): Promise<ServiceResponse<DmChannelSummary>> => {
        try {
            const response: AxiosResponse<BackendResponse<DmChannelSummary>> =
                await apiClient.get<BackendResponse<DmChannelSummary>>(
                    `/channels/dm/${encodeURIComponent(channelId)}/summary`
                );

            return {
                success: true,
                statusCode: response.status,
                data: response.data.data,
            };
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse<DmChannelSummary>>;
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