import type {
  BackendResponse,
  DirectConversationSummary,
  ServiceResponse,
  StartCallResult, TimelineMessageDto,
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

  getCurrentRingingCall: async (): Promise<ServiceResponse<UserIdentityProfileDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<UserIdentityProfileDto>> =
        await apiClient.get<BackendResponse<UserIdentityProfileDto>>(`/conversations/direct/call`);

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<UserIdentityProfileDto>>;
      return handleAxiosError(axiosError);
    }
  },

  startDirectCall: async (peerId: string): Promise<ServiceResponse<StartCallResult>> => {
    try {
      const response: AxiosResponse<BackendResponse<StartCallResult>> =
        await apiClient.post<BackendResponse<StartCallResult>>(
          `/calls/direct/${encodeURIComponent(peerId)}`
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

  cancelDirectCall: async (callId: string): Promise<ServiceResponse<TimelineMessageDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.patch<BackendResponse<TimelineMessageDto>>(
          `/calls/${encodeURIComponent(callId)}/cancel`
        );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<TimelineMessageDto>>;
      return handleAxiosError(axiosError);
    }
  },

  acceptDirectCall: async (callId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.patch<BackendResponse>(
          `/calls/${encodeURIComponent(callId)}/accept`
        );

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  rejectDirectCall: async (callId: string): Promise<ServiceResponse<TimelineMessageDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.patch<BackendResponse<TimelineMessageDto>>(
          `/calls/${encodeURIComponent(callId)}/reject`
        );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<TimelineMessageDto>>;
      return handleAxiosError(axiosError);
    }
  },

  endDirectCall: async (callId: string): Promise<ServiceResponse<TimelineMessageDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.patch<BackendResponse<TimelineMessageDto>>(
          `/calls/${encodeURIComponent(callId)}/end`
        );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<TimelineMessageDto>>;
      return handleAxiosError(axiosError);
    }
  },
}