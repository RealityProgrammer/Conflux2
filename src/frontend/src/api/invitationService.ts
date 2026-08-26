import type {InvitationExpireAfter} from "./requests.ts";
import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {BackendResponse, SendFriendRequestResponse, ServiceResponse} from "./responses.ts";
import {apiClient, executeGraphQL} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";
import {gql} from "../gql";
import type {GetInvitationSummaryQuery} from "../gql/graphql.ts";

const GET_INVITATION_SUMMARY = gql(`
  query GetInvitationSummary($id: String!) {
    invitationById(id: $id) {
      communityServer {
        id
        name,
        hasAvatar
        numMembers
      },
      status
    }
  }
`);

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

  getInvitationSummary: async (invitationId: string): Promise<ServiceResponse<GetInvitationSummaryQuery['invitationById']>> => {
    try {
      const data = await executeGraphQL(GET_INVITATION_SUMMARY, {id: invitationId});

      return {
        success: true,
        statusCode: data.invitationById ? HttpStatusCode.Ok : HttpStatusCode.NotFound,
        data: data.invitationById
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
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