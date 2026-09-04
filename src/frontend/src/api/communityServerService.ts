import type {AxiosError, AxiosResponse} from "axios";
import type {
  BackendResponse, ChannelCategoryIdentityDto, ServerChannelIdentityDto,
  ServerDetailDto, ServerIdentityDto,
  ServerMemberPermissionsDto, ServerRoleDto,
  ServiceResponse
} from "./types.ts";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import type {PermissionState} from "../graphql/types.ts";
import type {ServerPermission} from "./schema.ts";

export const communityServerService = {
  createServer: async (idempotencyKey: string, name: string, avatar?: File): Promise<ServiceResponse<ServerIdentityDto>> => {
    try {
      const formData = new FormData();

      formData.append("name", name);

      if (avatar) {
        formData.append("avatar", avatar);
      }

      const response: AxiosResponse<BackendResponse<ServerIdentityDto>> =
        await apiClient.post(`/communities`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            "Idempotency-Key": idempotencyKey,
          },
        });

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<ServerIdentityDto>>;
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

  getSummary: async (serverId: string): Promise<ServiceResponse<ServerDetailDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<ServerDetailDto>> =
        await apiClient.get<BackendResponse<ServerDetailDto>>(`/communities/${encodeURIComponent(serverId)}/summary`);

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<ServerDetailDto>>;
      return handleAxiosError(axiosError);
    }
  },

  createChannelCategory: async (idempotencyKey: string, serverId: string, name: string): Promise<ServiceResponse<ChannelCategoryIdentityDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<ChannelCategoryIdentityDto>> =
        await apiClient.post<BackendResponse<ChannelCategoryIdentityDto>>(`/communities/${encodeURIComponent(serverId)}/channel-categories`, {
          name,
        }, {
          headers: {
            "Idempotency-Key": idempotencyKey,
            "Content-Type": "application/json",
          }
        });

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<ChannelCategoryIdentityDto>>;
      return handleAxiosError(axiosError);
    }
  },

  createChannel: async (
    idempotencyKey: string,
    serverId: string,
    name: string,
    type: "text" | "voice",
    categoryId: string | null
  ): Promise<ServiceResponse<ServerChannelIdentityDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<ServerChannelIdentityDto>> =
        await apiClient.post<BackendResponse<ServerChannelIdentityDto>>(`/communities/${encodeURIComponent(serverId)}/channels`, {
          name,
          type,
          categoryId
        }, {
          headers: {
            "Idempotency-Key": idempotencyKey,
            "Content-Type": "application/json",
          }
        });

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<ServerChannelIdentityDto>>;
      return handleAxiosError(axiosError);
    }
  },

  deleteChannelCategory: async (serverId: string, categoryId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete<BackendResponse>(`/communities/${encodeURIComponent(serverId)}/channel-categories/${encodeURIComponent(categoryId)}`);

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  deleteChannel: async (serverId: string, categoryId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete<BackendResponse>(`/communities/${encodeURIComponent(serverId)}/channels/${encodeURIComponent(categoryId)}`);

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  getUserPermission: async (serverId: string): Promise<ServiceResponse<ServerMemberPermissionsDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<ServerMemberPermissionsDto>> =
        await apiClient.get<BackendResponse<ServerMemberPermissionsDto>>(`/communities/${encodeURIComponent(serverId)}/members/me/permissions`)

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<ServerMemberPermissionsDto>>;
      return handleAxiosError(axiosError);
    }
  },

  createRole: async (serverId: string, name: string, idempotencyKey: string): Promise<ServiceResponse<ServerRoleDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<ServerRoleDto>> =
        await apiClient.post<BackendResponse<ServerRoleDto>>(`/communities/${encodeURIComponent(serverId)}/roles`, {
          name,
        }, {
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
        });

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<ServerRoleDto>>;
      return handleAxiosError(axiosError);
    }
  },

  updateRole: async (serverId: string, roleId: string, data: {
    name?: string,
    authorizeLevel: number,
    permissionStates?: Map<ServerPermission, PermissionState> | Record<ServerPermission, PermissionState>,
  }): Promise<ServiceResponse<ServerRoleDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<ServerRoleDto>> =
        await apiClient.patch<BackendResponse<ServerRoleDto>>(`/communities/${encodeURIComponent(serverId)}/roles/${encodeURIComponent(roleId)}`, data);

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<ServerRoleDto>>;
      return handleAxiosError(axiosError);
    }
  },

  deleteRole: async (serverId: string, roleId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete<BackendResponse>(`/communities/${encodeURIComponent(serverId)}/roles/${encodeURIComponent(roleId)}`);

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  }
}