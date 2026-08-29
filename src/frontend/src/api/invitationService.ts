import type {InvitationExpireAfter} from "./types.ts";
import {type AxiosError, type AxiosResponse} from "axios";
import type {BackendResponse, ServiceResponse} from "./types.ts";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const invitationService = {
  createInvitation: async (serverId: string, expireAfter: InvitationExpireAfter, maxUses: number | null): Promise<ServiceResponse<string>> => {
    try {
      const response: AxiosResponse<BackendResponse<string>> =
        await apiClient.post<BackendResponse<string>>(`invite`, {
          serverId,
          maxUses,
          expireAfter
        });

      return {
        success: true,
        statusCode: response.status,
        data: response.data!.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<string>>;
      return handleAxiosError(axiosError);
    }
  },

  joinServer: async (invitationId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.post<BackendResponse>(`invite/${encodeURIComponent(invitationId)}/join`);

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