import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {BackendResponse, ServiceResponse, UserIdentityProfileDto} from "./responses.ts";
import {apiClient, executeGraphQL} from "./client.ts";
import type {AvatarOperation} from "./requests.ts";
import {handleAxiosError} from "./errorHandling.ts";
import {authService} from "./authService.ts";
import {gql} from "../gql";

const GET_USER_IDENTITY_PROFILE = gql(`
  query GetUserIdentityProfile($id: UUID!) {
    userById(id: $id) {
      id,
      userName,
      displayName,
      hasAvatar
    }
  }
`);

export const userService = {
  uploadAvatar: async (file: File): Promise<ServiceResponse> => {
    try {
      const formData: FormData = new FormData();
      formData.set("File", file);

      const response: AxiosResponse<BackendResponse> = await apiClient.post("/user/avatar", formData, {
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

  getAvatarUrl: (userId: string, forceRefresh: boolean): string => {
    const queryParams: URLSearchParams = new URLSearchParams({
      userId: userId,
    });

    if (forceRefresh) {
      queryParams.append("t", new Date().getTime().toString());
    }

    return `${import.meta.env.VITE_BACKEND_API_URL}/user/avatar?${queryParams.toString()}`;
  },

  deleteAvatar: async (): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete<BackendResponse>("/user/avatar");

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

      const response = await apiClient.post("/user/setup-profile", formData, {
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

  getUserIdentityProfile: async (userId: string): Promise<ServiceResponse<UserIdentityProfileDto>> => {
    try {
      const data = await executeGraphQL(GET_USER_IDENTITY_PROFILE, {id: userId});

      return {
        success: true,
        statusCode: data.userById.length > 0 ? HttpStatusCode.Ok : HttpStatusCode.NotFound,
        data: (data.userById[0] as unknown) as UserIdentityProfileDto,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },
}