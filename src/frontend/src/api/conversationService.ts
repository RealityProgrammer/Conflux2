import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {
  BackendResponse,
  TimelineMessageDto,
  ServiceResponse,
  TimelineMessagePage, MessageReadStrategy, DmConversationDetails, ServerChannelConversationDetails, MentionSource,
  MessageSearchPage, EditedMessageDto
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

  sendMessage: async (conversationId: string, idempotencyKey: string, body: string | null, attachments?: File[], replyToId?: string): Promise<TimelineMessageDto> => {
    const trimmedBody = body?.trim();

    if (!trimmedBody && !attachments) {
      throw new Error("Empty message content.");
    }

    const response: AxiosResponse<BackendResponse<TimelineMessageDto>> = await apiClient.postForm(
      `conversations/${encodeURIComponent(conversationId)}/messages`,
      { body: trimmedBody, attachments, replyToId, },
      { headers: { "Idempotency-Key": idempotencyKey } }
    );

    return response.data.data!;
  },

  editMessage: async (conversationId: string, messageId: string, newBody: string | null, removeAttachmentIds: string[], newAttachments: File[]): Promise<EditedMessageDto> => {
    const trimmedBody = newBody?.trim() ?? "";

    const response: AxiosResponse<BackendResponse<EditedMessageDto>> = await apiClient.patchForm(
      `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
      { body: trimmedBody, removeAttachmentIds, addAttachments: newAttachments }
    );

    return response.data.data!;
  },

  deleteMessage: async (conversationId: string, messageId: string): Promise<ServiceResponse> => {
    const response: AxiosResponse<BackendResponse> =
      await apiClient.delete(`conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`);

    return {
      success: true,
      statusCode: response.status,
    };
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

  getAttachmentViewUrl: (attachmentId: string): string => {
    return `/api/attachments/${encodeURIComponent(attachmentId)}/view`;
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
        pinFilter: request.pin,
        beforeCursor,
      }
    );

    return response.data.data!;
  }
}
