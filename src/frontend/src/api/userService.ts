import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {BackendResponse, ServiceResponse, UserFullProfileDto, UserIdentityProfileDto} from "./responses.ts";
import {apiClient, executeGraphQL} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
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

const GET_USER_FULL_PROFILE = gql(`
  query GetUserFullProfile($id: UUID!) {
    userById(id: $id) {
      id,
      userName,
      displayName,
      hasAvatar,
      biography,
      pronouns,
      createdAt,
      numMutualFriends
    }
  }
`);

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

  getUserIdentityProfile: async (userId: string): Promise<ServiceResponse<UserIdentityProfileDto>> => {
    try {
      const data = await executeGraphQL(GET_USER_IDENTITY_PROFILE, {id: userId});

      return {
        success: true,
        statusCode: data.userById ? HttpStatusCode.Ok : HttpStatusCode.NotFound,
        data: (data.userById as unknown) as UserIdentityProfileDto,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  getUserFullProfile: async (userId: string): Promise<ServiceResponse<UserFullProfileDto>> => {
    try {
      const data = await executeGraphQL(GET_USER_FULL_PROFILE, {id: userId});

      return {
        success: true,
        statusCode: data.userById ? HttpStatusCode.Ok : HttpStatusCode.NotFound,
        data: {
          ...data.userById,
          createdAt: new Date(data.userById?.createdAt ?? "")
        } as UserFullProfileDto,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  }
}