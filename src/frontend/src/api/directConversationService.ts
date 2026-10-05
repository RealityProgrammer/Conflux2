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

  cancelCall: async (peerId: string): Promise<ServiceResponse<TimelineMessageDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.patch<BackendResponse<TimelineMessageDto>>(
          `/conversations/direct/${encodeURIComponent(peerId)}/call/cancel`
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

  acceptCall: async (peerId: string): Promise<ServiceResponse<TimelineMessageDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.patch<BackendResponse<TimelineMessageDto>>(
          `/conversations/direct/${encodeURIComponent(peerId)}/call/accept`
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

  rejectCall: async (peerId: string): Promise<ServiceResponse<TimelineMessageDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.patch<BackendResponse<TimelineMessageDto>>(
          `/conversations/direct/${encodeURIComponent(peerId)}/call/reject`
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

  endCall: async (peerId: string): Promise<ServiceResponse<TimelineMessageDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.patch<BackendResponse<TimelineMessageDto>>(
          `/conversations/direct/${encodeURIComponent(peerId)}/call/end`
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