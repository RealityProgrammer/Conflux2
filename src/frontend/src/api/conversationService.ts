import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {
  BackendResponse,
  TimelineMessageDto,
  ServiceResponse,
  TimelineMessagePage, MessageReadStrategy
} from "./types.ts";
import {handleAxiosError} from "./errorHandling.ts";
import {apiClient} from "./client.ts";

export const conversationService = {
  sendMessage: async (conversationId: string, idempotencyKey: string, body: string | null, attachments?: File[], replyToId?: string): Promise<ServiceResponse<TimelineMessageDto>> => {
    const trimmedBody = body?.trim();

    if (!trimmedBody && !attachments) {
      return {
        success: false,
        statusCode: HttpStatusCode.BadRequest,
      };
    }

    try {
      const formData = new FormData();

      if (trimmedBody) {
        formData.append("body", trimmedBody);
      }

      if (attachments) {
        for (let i = 0; i < attachments.length; i++) {
          formData.append("attachments", attachments[i]);
        }
      }

      if (replyToId) {
        formData.append("replyToId", replyToId);
      }

      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> = await apiClient.postForm(
        `conversations/${encodeURIComponent(conversationId)}/messages`,
        formData,
        { headers: { "Idempotency-Key": idempotencyKey } }
      );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  editMessage: async (conversationId: string, messageId: string, newBody: string | null): Promise<ServiceResponse> => {
    const trimmedBody = newBody?.trim();

    try {
      const formData = new FormData();

      if (trimmedBody) {
        formData.append("body", trimmedBody);
      }

      const response: AxiosResponse<BackendResponse> =
        await apiClient.patchForm(`/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`, formData);

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  deleteMessage: async (conversationId: string, messageId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete(`conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`);

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  readTimelineMessages: async (conversationId: string, readStrategy: MessageReadStrategy): Promise<ServiceResponse<TimelineMessagePage>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessagePage>> =
        await apiClient.post(`/conversations/${encodeURIComponent(conversationId)}/messages/read`, {
          readStrategy,
        });

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  getAttachmentUrl: (attachmentId: string, forceRefresh: boolean): string => {
    let refreshParam: string;

    if (forceRefresh) {
      const params = new URLSearchParams();
      params.append("t", new Date().getTime().toString());
      refreshParam = `?${params.toString()}`;
    } else {
      refreshParam = "";
    }

    return `/api/attachments/${encodeURIComponent(attachmentId)}${refreshParam}`;
  },

  getAttachmentDownloadUrl: (attachmentId: string): string => {
    const searchParams = new URLSearchParams();
    searchParams.append("download", "true");

    return `/api/attachments/${encodeURIComponent(attachmentId)}?${searchParams.toString()}`;
  },

  pinMessage: async (idempotencyKey: string, conversationId: string, messageId: string, action: "pin" | "unpin"): Promise<ServiceResponse<TimelineMessageDto>> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> = await apiClient.post(
        `conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/${encodeURIComponent(action)}`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } }
      );

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },
}
