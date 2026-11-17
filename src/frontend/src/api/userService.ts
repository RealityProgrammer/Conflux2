import type {
  BackendResponse,
  FriendSearchResponse,
  ServiceResponse,
  UserIdentityProfileDto,
} from "./types.ts";
import { type AxiosError, type AxiosResponse } from "axios";
import { apiClient } from "./client.ts";
import { csrfService } from "./csrfService.ts";
import { handleAxiosError } from "./errorHandling.ts";

export const userService = {
  getAvatarUrl: (userId: string, version: number): string => {
    const url = `/api/users/${encodeURIComponent(userId)}/avatar`;

    const queryParams: URLSearchParams = new URLSearchParams();
    queryParams.append("v", String(version));

    return `${url}?${queryParams.toString()}`;
  },

  getBannerUrl: (userId: string, version: number): string => {
    const url = `/api/users/${encodeURIComponent(userId)}/banner`;

    const queryParams: URLSearchParams = new URLSearchParams();
    queryParams.append("v", String(version));

    return `${url}?${queryParams.toString()}`;
  },

  getIdentities: async (
    ids: string[],
  ): Promise<ServiceResponse<UserIdentityProfileDto[]>> => {
    try {
      const response: AxiosResponse<BackendResponse<UserIdentityProfileDto[]>> =
        await apiClient.post("/users/get-identities", { ids });

      await csrfService.requestCsrfToken();

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<
        BackendResponse<UserIdentityProfileDto[]>
      >;
      return handleAxiosError(axiosError);
    }
  },

  discoverFriend: async (
    searchTerm: string,
  ): Promise<FriendSearchResponse | null> => {
    const params = new URLSearchParams();
    params.set("search", searchTerm);

    const response: AxiosResponse<BackendResponse<FriendSearchResponse>> =
      await apiClient.get(`/users/discover-friend?${params.toString()}`);

    return response.data.data ?? null;
  },
};
