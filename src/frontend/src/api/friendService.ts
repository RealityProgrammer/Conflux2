import type {
  BackendResponse,
  SendFriendRequestResult,
  ServiceResponse,
} from "./types.ts";
import type { AxiosResponse } from "axios";
import { apiClient } from "./client.ts";

export const friendService = {
  sendFriendRequest: async (
    recipientId: string,
  ): Promise<ServiceResponse<SendFriendRequestResult>> => {
    const response: AxiosResponse<BackendResponse<SendFriendRequestResult>> =
      await apiClient.post<BackendResponse<SendFriendRequestResult>>(
        "/friend-requests",
        { recipientId },
      );

    return {
      success: true,
      statusCode: response.status,
      data: response.data!.data,
    };
  },

  acceptFriendRequest: async (
    senderUserId: string,
  ): Promise<ServiceResponse> => {
    const response: AxiosResponse<BackendResponse> =
      await apiClient.post<BackendResponse>(
        `/friend-requests/${encodeURIComponent(senderUserId)}/accept`,
      );

    return {
      success: true,
      statusCode: response.status,
    };
  },

  rejectFriendRequest: async (
    senderUserId: string,
  ): Promise<ServiceResponse> => {
    const response: AxiosResponse<BackendResponse> =
      await apiClient.post<BackendResponse>(
        `/friend-requests/${encodeURIComponent(senderUserId)}/reject`,
      );

    return {
      success: true,
      statusCode: response.status,
    };
  },

  cancelFriendRequest: async (requestId: string): Promise<ServiceResponse> => {
    const response: AxiosResponse<BackendResponse> =
      await apiClient.post<BackendResponse>(
        `/friend-requests/${encodeURIComponent(requestId)}/cancel`,
      );

    return {
      success: true,
      statusCode: response.status,
    };
  },

  unfriend: async (userId: string): Promise<ServiceResponse> => {
    const response: AxiosResponse<BackendResponse> =
      await apiClient.delete<BackendResponse>(
        `/friends/${encodeURIComponent(userId)}`,
      );

    return {
      success: true,
      statusCode: response.status,
    };
  },
};
