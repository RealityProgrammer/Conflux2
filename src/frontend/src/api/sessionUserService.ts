import type {
  BackendResponse,
  DmConversationListItemDto,
  PaginatedResponse, QueryPendingRequestElement,
  ServiceResponse,
  UserIdentityProfileDto
} from "./responses.ts";
import type {AxiosError, AxiosResponse} from "axios";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const sessionUserService = {
  getDmConversations: async (offset: number, count: number): Promise<ServiceResponse<PaginatedResponse<DmConversationListItemDto>>> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("offset", String(offset));
      searchParams.set("count", String(count));

      const response: AxiosResponse<BackendResponse<PaginatedResponse<DmConversationListItemDto>>> =
        await apiClient.get<BackendResponse<PaginatedResponse<DmConversationListItemDto>>>(
          `/channels/dm?${searchParams.toString()}`
        );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<PaginatedResponse<DmConversationListItemDto>>>;
      return handleAxiosError(axiosError);
    }
  },

  queryFriends: async (name: string | null, offset: number, count: number): Promise<ServiceResponse<PaginatedResponse<UserIdentityProfileDto>>> => {
    try {
      const searchParams = new URLSearchParams();

      if (name) {
        searchParams.append("name", name);
      }

      searchParams.append("offset", String(offset));
      searchParams.append("count", String(count));

      const response: AxiosResponse<BackendResponse<PaginatedResponse<UserIdentityProfileDto>>> =
        await apiClient.get<BackendResponse<PaginatedResponse<UserIdentityProfileDto>>>(`/friend/friends?${searchParams.toString()}`);

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

  queryPendingRequests: async (name: string | null, offset: number, count: number): Promise<ServiceResponse<PaginatedResponse<QueryPendingRequestElement>>> => {
    try {
      const searchParams = new URLSearchParams();

      if (name) {
        searchParams.append("name", name);
      }

      searchParams.append("offset", String(offset));
      searchParams.append("count", String(count));

      const response: AxiosResponse<BackendResponse<PaginatedResponse<QueryPendingRequestElement>>> =
        await apiClient.get<BackendResponse<PaginatedResponse<QueryPendingRequestElement>>>(`/friend/pending-requests?${searchParams.toString()}`);

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