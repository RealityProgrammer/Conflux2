import {type AxiosError, type AxiosResponse} from "axios";
import type {BackendResponse, ServiceResponse,} from "./types.ts";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const userService = {
  getAvatarUrl: (userId: string, forceRefresh: boolean): string => {
    const queryParams: URLSearchParams = new URLSearchParams();

    if (forceRefresh) {
      queryParams.append("t", new Date().getTime().toString());
    }

    return `/api/users/${encodeURIComponent(userId)}/avatar?${queryParams.toString()}`;
  },

  deleteAvatar: async (userId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete<BackendResponse>(`/users/${encodeURIComponent(userId)}/avatar`);

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