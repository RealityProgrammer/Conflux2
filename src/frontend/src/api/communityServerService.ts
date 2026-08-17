import type {AxiosError, AxiosResponse} from "axios";
import type {BackendResponse, ServiceResponse} from "./responses.ts";
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
}