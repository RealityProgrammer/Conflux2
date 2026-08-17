import type {
  BackendResponse,
  DmConversationListItemDto,
  PaginatedResponse, QueryPendingRequestElement,
  ServiceResponse,
  UserIdentityProfileDto
} from "./responses.ts";
import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import {apiClient, executeGraphQL} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import {gql} from "../gql";
import type {GetJoinedCommunityServerQuery} from "../gql/graphql.ts";
import type {AvatarOperation} from "./requests.ts";
import {authService} from "./authService.ts";

const GET_JOINED_COMMUNITY_SERVERS = gql(`
query GetJoinedCommunityServer($after: String) {
  joinedServers(after: $after) {
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
    }
    nodes {
      id
      name
      hasAvatar
    }
  }
}
`);

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

  getJoinedCommunityServers: async (after: string | null): Promise<ServiceResponse<GetJoinedCommunityServerQuery['joinedServers']>> => {
    try {
      const data: GetJoinedCommunityServerQuery = await executeGraphQL(GET_JOINED_COMMUNITY_SERVERS, {after: after, count: 20});

      return {
        success: true,
        statusCode: HttpStatusCode.Ok,
        data: data.joinedServers
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<GetJoinedCommunityServerQuery['joinedServers']>>;
      return handleAxiosError(axiosError);
    }
  }
}