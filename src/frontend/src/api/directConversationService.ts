import type {
  BackendResponse,
  DirectConversationSummary,
  ServiceResponse,
  StartCallResult,
  UserIdentityProfileDto
} from "./types.ts";
import type {AxiosError, AxiosResponse} from "axios";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const directConversationService = {
  getDirectConversationSummary: async (peerId: string): Promise<ServiceResponse<DirectConversationSummary>> => {
    try {
      const response: AxiosResponse<BackendResponse<DirectConversationSummary>> =
        await apiClient.post<BackendResponse<DirectConversationSummary>>(
          `/conversations/direct/${encodeURIComponent(peerId)}`
        );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<DirectConversationSummary>>;
      return handleAxiosError(axiosError);
    }
  },

  startCall: async (peerId: string): Promise<ServiceResponse<StartCallResult>> => {
    try {
      const response: AxiosResponse<BackendResponse<StartCallResult>> =
        await apiClient.post<BackendResponse<StartCallResult>>(
          `/conversations/direct/${encodeURIComponent(peerId)}/call`
        );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<StartCallResult>>;
      return handleAxiosError(axiosError);
    }
  },
}