import type {BackendResponse, DirectMessageResolutionResponse, ServiceResponse} from "./responses.ts";
import apiClient from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import type {AxiosError, AxiosResponse} from "axios";

export const channelService = {
    getDirectMessageConversationId: async (toUserId: string): Promise<ServiceResponse<string>> => {
        try {
            const response: AxiosResponse<BackendResponse<DirectMessageResolutionResponse>> =
                await apiClient.post<BackendResponse<DirectMessageResolutionResponse>>(
                    `/channel/dm/${encodeURIComponent(toUserId)}`
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