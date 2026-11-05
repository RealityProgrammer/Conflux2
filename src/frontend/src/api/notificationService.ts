import type {BackendResponse, ServiceResponse, UnreadNotificationCounts} from "./types.ts";
import type {AxiosError, AxiosResponse} from "axios";
import {apiClient} from "./client.ts";
import {handleAxiosError} from "./errorHandling.ts";

export const notificationService = {
  getUnreadNotificationsCount: async (): Promise<ServiceResponse<UnreadNotificationCounts>> => {
    try {
      const response: AxiosResponse<BackendResponse<UnreadNotificationCounts>> = await apiClient.get("/notifications/unread-counts");

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<UnreadNotificationCounts>>;
      return handleAxiosError(axiosError);
    }
  },
}