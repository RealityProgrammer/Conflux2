import type {
  BackendResponse,
  PaginatedResult, PendingFriendRequestDto,
  ServiceResponse,
  UserIdentityProfileDto
} from "./types.ts";
import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import {authService} from "./authService.ts";
import type {PresenceStatus} from "../graphql/types.ts";

export const sessionUserService = {
  uploadAvatar: async (file: File): Promise<ServiceResponse> => {
    try {
      const formData = new FormData();
      formData.set("File", file);

      const response: AxiosResponse<BackendResponse> = await apiClient.postForm("/users/me/avatar", formData);

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

  setNames: async (userName: string, displayName: string): Promise<ServiceResponse> => {
    try {
      const response = await apiClient.post("/users/me/names", {
        userName,
        displayName,
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

  lockName: async (): Promise<ServiceResponse> => {
    try {
      const response = await apiClient.post("/users/me/lock-name");

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

  queryFriends: async (name: string | null, offset: number, count: number): Promise<ServiceResponse<PaginatedResult<UserIdentityProfileDto>>> => {
    try {
      const searchParams = new URLSearchParams();

      if (name) {
        searchParams.append("name", name);
      }

      searchParams.append("offset", String(offset));
      searchParams.append("count", String(count));

      const response: AxiosResponse<BackendResponse<PaginatedResult<UserIdentityProfileDto>>> =
        await apiClient.get<BackendResponse<PaginatedResult<UserIdentityProfileDto>>>(`users/me/friends?${searchParams.toString()}`);

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  queryPendingRequests: async (name: string | null, offset: number, count: number): Promise<ServiceResponse<PaginatedResult<PendingFriendRequestDto>>> => {
    try {
      const searchParams = new URLSearchParams();

      if (name) {
        searchParams.append("name", name);
      }

      searchParams.append("offset", String(offset));
      searchParams.append("count", String(count));

      const response: AxiosResponse<BackendResponse<PaginatedResult<PendingFriendRequestDto>>> =
        await apiClient.get<BackendResponse<PaginatedResult<PendingFriendRequestDto>>>(`users/me/pending-requests?${searchParams.toString()}`);

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  updateProfile: async (
    displayName?: string,
    pronouns?: string | null,
    biography?: string | null,
    manualPresenceStatus?: PresenceStatus,
    avatar?: File | null,
    banner?: File | null,
  ): Promise<ServiceResponse> => {
    try {
      const formData = new FormData();

      if (displayName !== undefined) {
        formData.append("displayName", displayName);
      }

      if (pronouns !== undefined) {
        formData.append("pronouns", pronouns || "");
      }

      if (biography !== undefined) {
        formData.append("biography", biography || "");
      }

      if (manualPresenceStatus !== undefined) {
        formData.append("manualPresenceStatus", manualPresenceStatus);
      }

      if (avatar !== undefined) {
        formData.append("avatar.type", avatar === null ? "Delete" : "Set");

        if (avatar !== null) {
          formData.append("avatar.file", avatar);
        }
      } else {
        formData.append("avatar.type", "NoMod");
      }

      if (banner !== undefined) {
        formData.append("banner.type", banner === null ? "Delete" : "Set");

        if (banner !== null) {
          formData.append("banner.file", banner);
        }
      } else {
        formData.append("banner.type", "NoMod");
      }

      const response: AxiosResponse<BackendResponse> =
        await apiClient.patchForm<BackendResponse>(`users/me/profile`, formData);

      return {
        success: true,
        statusCode: response.status,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  }
}