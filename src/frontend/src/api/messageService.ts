import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {BackendResponse, GetMessagesResponse, TimelineMessageDto, ServiceResponse} from "./types.ts";
import {handleAxiosError} from "./errorHandling.ts";
import {apiClient} from "./client.ts";
import type {MessageLoadDirection} from "./schema.ts";

export const messageService = {
  sendMessage: async (channelId: string, idempotencyKey: string, body: string | null, attachments?: File[], replyToId?: string): Promise<ServiceResponse<TimelineMessageDto>> => {
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

      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.postForm(`channels/${encodeURIComponent(channelId)}/messages`, formData, {
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
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

  editMessage: async (messageId: string, newBody: string | null): Promise<ServiceResponse<TimelineMessageDto>> => {
    const trimmedBody = newBody?.trim();

    try {
      const formData = new FormData();

      if (trimmedBody) {
        formData.append("body", trimmedBody);
      }

      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.patchForm(`/messages/${encodeURIComponent(messageId)}`, formData);

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

  deleteMessage: async (messageId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse<TimelineMessageDto>> =
        await apiClient.delete(`messages/${encodeURIComponent(messageId)}`);

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  getMessages: async (channelId: string, direction: MessageLoadDirection | undefined, cursor: string | undefined, count: number): Promise<ServiceResponse<GetMessagesResponse>> => {
    try {
      const searchParams = new URLSearchParams();

      if (cursor && direction) {
        searchParams.append("cursor", cursor);
        searchParams.append("direction", direction);
      }

      searchParams.append("count", String(count));

      const response: AxiosResponse<BackendResponse<GetMessagesResponse>> =
        await apiClient.get(`/channels/${encodeURIComponent(channelId)}/messages?${searchParams.toString()}`);

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
}
