import type {AxiosError, AxiosResponse} from "axios";
import type {BackendResponse, CommunityServerSummaryDto, ServiceResponse} from "./responses.ts";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const communityServerService = {
  create: async (idempotencyKey: string, name: string, avatar?: File): Promise<ServiceResponse> => {
    try {
      const formData = new FormData();

      formData.append("name", name);

      if (avatar) {
        formData.append("avatar", avatar);
      }

      const response: AxiosResponse<BackendResponse> =
        await apiClient.post(`/communities`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            "Idempotency-Key": idempotencyKey,
          },
        });

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  getAvatarUrl: (serverId: string, forceRefresh: boolean): string => {
    const queryParams: URLSearchParams = new URLSearchParams();

    if (forceRefresh) {
      queryParams.append("t", new Date().getTime().toString());
    }

    return `/api/communities/${encodeURIComponent(serverId)}/avatar?${queryParams}`;
  },

  getSummary: async (serverId: string): Promise<ServiceResponse<CommunityServerSummaryDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<CommunityServerSummaryDto>> =
        await apiClient.get<BackendResponse<CommunityServerSummaryDto>>(`/communities/${encodeURIComponent(serverId)}/summary`);

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<CommunityServerSummaryDto>>;
      return handleAxiosError(axiosError);
    }
  },

  createChannelCategory: async (serverId: string, name: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.post<BackendResponse>(`/communities/${encodeURIComponent(serverId)}/channel-categories`);

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },
}