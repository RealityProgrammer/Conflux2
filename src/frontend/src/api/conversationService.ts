import { type AxiosResponse } from "axios";
import type {
  BackendResponse,
  TimelineMessageDto,
  TimelineMessagePage,
  DmConversationDetails,
  ServerChannelConversationDetails,
  MentionSource,
  MessageSearchPage,
  EditedMessageDto,
  KeyedPaginatedPage,
  PinnedMessageDto,
} from "./types.ts";
import { apiClient } from "./client.ts";
import type { SearchRequest } from "../store/useHistoryConversationSearchStore.ts";

export const conversationService = {
  getDmConversationDetails: async (peerId: string): Promise<DmConversationDetails> => {
    const response: AxiosResponse<BackendResponse<DmConversationDetails>> = await apiClient.get(
      `/conversations/dm/${encodeURIComponent(peerId)}`,
    );

    return response.data.data!;
  },

  getServerChannelConversationDetails: async (
    serverId: string,
    channelId: string,
  ): Promise<ServerChannelConversationDetails> => {
    const response: AxiosResponse<BackendResponse<ServerChannelConversationDetails>> = await apiClient.get(
      `/conversations/servers/${encodeURIComponent(serverId)}/channels/${encodeURIComponent(channelId)}`,
    );

    return response.data.data!;
  },

  sendMessage: async (
    conversationId: string,
    idempotencyKey: string,
    body: string | null,
    attachments: File[],
    replyToId: string | null,
  ): Promise<TimelineMessageDto> => {
    const trimmedBody = body?.trim();

    if (!trimmedBody && !attachments) {
      throw new Error("Empty message content.");
    }

    const response: AxiosResponse<BackendResponse<TimelineMessageDto>> = await apiClient.postForm(
      `conversations/${encodeURIComponent(conversationId)}/messages`,
      { body: trimmedBody, attachments, replyToId },
      { headers: { "Idempotency-Key": idempotencyKey } },
    );

    return response.data.data!;
  },

  editMessage: async (
    conversationId: string,
    messageId: string,
    body?: string | null,
    removeAttachmentIds?: string[],
    newAttachments?: File[],
  ): Promise<EditedMessageDto> => {
    const trimmedBody = body?.trim() ?? "";

    const response: AxiosResponse<BackendResponse<EditedMessageDto>> = await apiClient.patchForm(
      `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
      {
        body: trimmedBody,
        removeAttachmentIds,
        addAttachments: newAttachments,
      },
    );

    return response.data.data!;
  },

  deleteMessage: async (conversationId: string, messageId: string): Promise<void> => {
    await apiClient.delete(
      `conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    );
  },

  queryTimelineMessages: async (
    conversationId: string,
    loadDirection: "Around" | "Before" | "After" | "Latest",
    cursorMessageId?: string,
  ): Promise<TimelineMessagePage> => {
    const params = new URLSearchParams();
    params.set("direction", loadDirection);

    if (cursorMessageId) {
      params.set("cursor", cursorMessageId);
    }

    const response: AxiosResponse<BackendResponse<TimelineMessagePage>> = await apiClient.get(
      `/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`,
    );

    return response.data.data!;
  },

  queryPinnedMessages: async (
    conversationId: string,
    before?: string,
    after?: string,
  ): Promise<KeyedPaginatedPage<string, PinnedMessageDto>> => {
    const params = new URLSearchParams();

    if (before) {
      params.set("before", before);
    } else if (after) {
      params.set("after", after);
    }

    const response: AxiosResponse<BackendResponse<KeyedPaginatedPage<string, PinnedMessageDto>>> =
      await apiClient.get(
        `/conversations/${encodeURIComponent(conversationId)}/pinned-messages?${params.toString()}`,
      );

    return response.data.data!;
  },

  getAttachmentViewUrl: (attachmentId: string): string => {
    return `/api/attachments/${encodeURIComponent(attachmentId)}/view`;
  },

  getAttachmentDownloadUrl: (attachmentId: string): string => {
    return `/api/attachments/${encodeURIComponent(attachmentId)}/download`;
  },

  pinMessage: async (
    idempotencyKey: string,
    conversationId: string,
    messageId: string,
    action: "pin" | "unpin",
  ): Promise<TimelineMessageDto> => {
    const response: AxiosResponse<BackendResponse<TimelineMessageDto>> = await apiClient.post(
      `conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/${encodeURIComponent(action)}`,
      {},
      { headers: { "Idempotency-Key": idempotencyKey } },
    );

    return response.data.data!;
  },

  markMentionNotificationsAsRead: async (conversationId: string): Promise<MentionSource | null> => {
    const response: AxiosResponse<BackendResponse<MentionSource | null>> = await apiClient.post(
      `conversations/${encodeURIComponent(conversationId)}/read-mentions`,
    );

    return response.data.data ?? null;
  },

  searchMessage: async (
    conversationId: string,
    request: SearchRequest,
    beforeCursor: string | null,
  ): Promise<MessageSearchPage> => {
    const response: AxiosResponse<BackendResponse<MessageSearchPage>> = await apiClient.post(
      `conversations/${encodeURIComponent(conversationId)}/messages/search`,
      {
        content: request.content,
        senderIds: request.senderIds,
        startDateTime: request.timeRange?.start,
        endDateTime: request.timeRange?.end,
        pinFilter: request.pin,
        beforeCursor,
      },
    );

    return response.data.data!;
  },

  toggleReaction: async (
    conversationId: string,
    messageId: string,
    reactionKey: `${"unicode" | "emoji"}.${string}`,
    action: "add" | "remove",
  ): Promise<void> => {
    await apiClient.post(
      `conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/reactions`,
      { reactionKey, action },
    );
  },
};
