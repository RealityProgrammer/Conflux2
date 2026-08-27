import type {
  BackendResponse,
  DmConversationListItemDto,
  PaginatedResponse, QueryPendingRequestElement,
  ServiceResponse,
  UserIdentityProfileDto
} from "./responses.ts";
import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import type {AvatarOperation} from "./requests.ts";
import {authService} from "./authService.ts";

export const sessionUserService = {
  uploadAvatar: async (file: File): Promise<ServiceResponse> => {
    try {
      const formData: FormData = new FormData();
      formData.set("File", file);

      const response: AxiosResponse<BackendResponse> = await apiClient.post("/users/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      });

      return {
        success: true,
        statusCode: response.status,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  deleteAvatar: async (): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete<BackendResponse>("/users/me/avatar");

      return {
        success: true,
        statusCode: response.status,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  setupProfile: async (userName: string,
                       displayName: string,
                       avatarOperation: AvatarOperation): Promise<ServiceResponse> => {
    try {
      const formData = new FormData();
      formData.append("userName", userName);
      formData.append("displayName", displayName);
      formData.append("avatarOperation", avatarOperation.type);

      if (avatarOperation.type === "set") {
        formData.append("avatarFile", avatarOperation.file);
      }

      const response = await apiClient.post("/users/me/setup-profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      });

      if (response.status === HttpStatusCode.Ok) {
        // refresh the authorization information to refresh the profile setup claim.
        await authService.refresh();
      }

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  getDmConversations: async (offset: number, count: number): Promise<ServiceResponse<PaginatedResponse<DmConversationListItemDto>>> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("offset", String(offset));
      searchParams.set("count", String(count));

      const response: AxiosResponse<BackendResponse<PaginatedResponse<DmConversationListItemDto>>> =
        await apiClient.get<BackendResponse<PaginatedResponse<DmConversationListItemDto>>>(
          `/users/me/dm?${searchParams.toString()}`
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
        await apiClient.get<BackendResponse<PaginatedResponse<UserIdentityProfileDto>>>(`users/me/friends?${searchParams.toString()}`);

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
        await apiClient.get<BackendResponse<PaginatedResponse<QueryPendingRequestElement>>>(`users/me/pending-requests?${searchParams.toString()}`);

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