import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {
  BackendResponse,
  TimelineMessageDto,
  ServiceResponse,
  TimelineMessagePage, MessageReadStrategy, DmConversationDetails, ServerChannelConversationDetails, MentionSource,
  MessageSearchPage
} from "./types.ts";
import {handleAxiosError} from "./errorHandling.ts";
import {apiClient} from "./client.ts";
import type {SearchRequest} from "../store/useHistoryConversationSearchStore.ts";

export const conversationService = {
  getDmConversationDetails: async (peerId: string): Promise<DmConversationDetails> => {
    const response: AxiosResponse<BackendResponse<DmConversationDetails>> =
      await apiClient.get(`/conversations/dm/${encodeURIComponent(peerId)}`);

    return response.data.data!;
  },

  getServerChannelConversationDetails: async (serverId: string, channelId: string): Promise<ServerChannelConversationDetails> => {
    const response: AxiosResponse<BackendResponse<ServerChannelConversationDetails>> =
      await apiClient.get(`/conversations/servers/${encodeURIComponent(serverId)}/channels/${encodeURIComponent(channelId)}`);

    return response.data.data!;
  },

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

  getAttachmentImageUrl: (attachmentId: string, forceRefresh: boolean): string => {
    let refreshParam: string;

    if (forceRefresh) {
      const params = new URLSearchParams();
      params.append("t", new Date().getTime().toString());
      refreshParam = `?${params.toString()}`;
    } else {
      refreshParam = "";
    }

    return `/api/attachments/${encodeURIComponent(attachmentId)}/image${refreshParam}`;
  },

  getAttachmentDownloadUrl: (attachmentId: string): string => {
    return `/api/attachments/${encodeURIComponent(attachmentId)}/download`;
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

  markMentionNotificationsAsRead: async (conversationId: string): Promise<MentionSource | null> => {
    const response: AxiosResponse<BackendResponse<MentionSource | null>> =
      await apiClient.post(`conversations/${encodeURIComponent(conversationId)}/read-mentions`);

    return response.data.data ?? null;
  },

  searchMessage: async (conversationId: string, request: SearchRequest, beforeCursor: string | null): Promise<MessageSearchPage> => {
    const response: AxiosResponse<BackendResponse<MessageSearchPage>> = await apiClient.post(
      `conversations/${encodeURIComponent(conversationId)}/messages/search`,
      {
        content: request.content,
        senderIds: request.senderIds,
        startDateTime: request.timeRange?.start,
        endDateTime: request.timeRange?.end,
        beforeCursor,
      }
    );

    return response.data.data!;
  }
}
