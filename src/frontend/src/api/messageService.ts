import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {BackendResponse, GetMessagesResponse, MessageDto, ServiceResponse} from "./responses.ts";
import {handleAxiosError} from "./errorHandling.ts";
import {apiClient} from "./client.ts";
import type {GetMessagesRequest} from "./requests.ts";

export const messageService = {
  sendMessage: async (channelId: string, idempotencyKey: string, body: string | null, attachments?: File[], replyToId?: string): Promise<ServiceResponse<MessageDto>> => {
    const trimmedBody = body?.trim();

    if (!trimmedBody && !attachments) {
      return {
        success: false,
        statusCode: HttpStatusCode.BadRequest,
      };
    }

    // TODO: Client-side validate the attachments
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

      const response: AxiosResponse<BackendResponse<MessageDto>> =
        await apiClient.post(`/channels/${encodeURIComponent(channelId)}/messages`, formData, {
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
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  editMessage: async (messageId: string, newBody: string | null): Promise<ServiceResponse<MessageDto>> => {
    const trimmedBody = newBody?.trim();

    try {
      const formData = new FormData();

      if (trimmedBody) {
        formData.append("body", trimmedBody);
      }

      const response: AxiosResponse<BackendResponse<MessageDto>> =
        await apiClient.patch(`/messages/${encodeURIComponent(messageId)}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          }
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

  deleteMessage: async (messageId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse<MessageDto>> =
        await apiClient.delete(`/messages/${encodeURIComponent(messageId)}`);

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  getMessages: async (request: GetMessagesRequest): Promise<ServiceResponse<GetMessagesResponse>> => {
    try {
      const searchParams = new URLSearchParams();

      if (request.cursor && request.direction) {
        searchParams.append("cursor", request.cursor);
        searchParams.append("direction", request.direction);
      }

      searchParams.append("count", String(request.count));

      const response: AxiosResponse<BackendResponse<GetMessagesResponse>> =
        await apiClient.get(`/channels/${encodeURIComponent(request.channelId)}/messages?${searchParams.toString()}`);

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
}
