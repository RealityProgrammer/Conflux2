import type {InvitationExpireAfter} from "./requests.ts";
import type {AxiosError, AxiosResponse} from "axios";
import type {BackendResponse, SendFriendRequestResponse} from "./responses.ts";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const invitationService = {
  createInvitation: async (serverId: string, expireAfter: InvitationExpireAfter, maxUses: number | null) => {
    try {
      const response: AxiosResponse<BackendResponse<string>> =
        await apiClient.post<BackendResponse<string>>(`invite`, {
          serverId,
          maxUses,
          expireIn: expireAfter
        });

      return {
        success: true,
        statusCode: response.status,
        data: response.data!.data,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<SendFriendRequestResponse>>;
      return handleAxiosError(axiosError);
    }
  }
}