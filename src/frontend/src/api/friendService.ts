import type {
  BackendResponse,
  DiscoverFriendSummary,
  PaginatedResult,
  ServiceResponse,
} from "./types.ts";
import type {AxiosError, AxiosResponse} from "axios";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import type {UserRelationshipStatus} from "./schema.ts";

export const friendService = {
  discover: async (name: string | null, offset: number, count: number): Promise<ServiceResponse<PaginatedResult<DiscoverFriendSummary>>> => {
    try {
      const searchParams = new URLSearchParams();

      if (name) {
        searchParams.append("name", name);
      }

      searchParams.append("offset", String(offset));
      searchParams.append("count", String(count));

      const response: AxiosResponse<BackendResponse<PaginatedResult<DiscoverFriendSummary>>> =
        await apiClient.get<BackendResponse<PaginatedResult<DiscoverFriendSummary>>>(`/friend/discover?${searchParams.toString()}`);

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

  sendFriendRequest: async (receiverUserId: string): Promise<ServiceResponse<UserRelationshipStatus>> => {
    try {
      const response: AxiosResponse<BackendResponse<UserRelationshipStatus>> =
        await apiClient.post<BackendResponse<UserRelationshipStatus>>(`/friend/requests/${encodeURIComponent(receiverUserId)}`);

      return {
        success: true,
        statusCode: response.status,
        data: response.data!.data,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<UserRelationshipStatus>>;
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
      const axiosError = error as AxiosError<BackendResponse>;
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
      const axiosError = error as AxiosError<BackendResponse>;
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
      const axiosError = error as AxiosError<BackendResponse>;
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
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },
}
