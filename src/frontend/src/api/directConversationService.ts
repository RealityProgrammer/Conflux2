import type {BackendResponse, DirectConversationSummary, ServiceResponse} from "./types.ts";
import type {AxiosError, AxiosResponse} from "axios";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const directConversationService = {
  getSummary: async (peerId: string): Promise<ServiceResponse<DirectConversationSummary>> => {
    try {
      const response: AxiosResponse<BackendResponse<DirectConversationSummary>> =
        await apiClient.get<BackendResponse<DirectConversationSummary>>(
          `/dm/${encodeURIComponent(peerId)}/summary`
        );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<DirectConversationSummary>>;
      return handleAxiosError(axiosError);
    }
  },
}