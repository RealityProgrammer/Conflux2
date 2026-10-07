import {type InfiniteData, useQueryClient} from "@tanstack/react-query";
import type {TimelineMessageDto, TimelineMessagePage} from "../api/types.ts";

interface UseTimelineMessagesResult {
  appendMessage: (message: TimelineMessageDto) => void;
  updateMessage: (messageId: string, properties: Partial<Omit<TimelineMessageDto, "id" | "type" | "conversationId">>) => void;
  deleteMessage: (messageId: string) => void;
}

export default function useTimelineMessageMutations(
  conversationId: string
): UseTimelineMessagesResult {
  const queryClient = useQueryClient();

  const modifyMessageData = (callback: (oldData: InfiniteData<TimelineMessagePage | null | undefined>) => InfiniteData<TimelineMessagePage | null | undefined>) => {
    queryClient.setQueriesData<InfiniteData<TimelineMessagePage | undefined | null>>(
      { queryKey: ["conversation", conversationId] },
      (oldData: NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined): NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return oldData;
        }

        return callback(oldData);
      }
    );
  }

  const appendMessage = (newMessage: TimelineMessageDto) => {
    modifyMessageData((oldData: InfiniteData<TimelineMessagePage | null | undefined>): InfiniteData<TimelineMessagePage | null | undefined> => {
      if (!oldData || !oldData.pages || oldData.pages.length === 0) return oldData;

      const lastPage = oldData.pages[oldData.pages.length - 1];
      if (!lastPage) return oldData;

      // only append if the loading zone is at the bottom
      if (lastPage.hasMoreAfter === true) return oldData;

      return {
        ...oldData,
        pages: [
          ...oldData.pages.slice(0, -1),
          {
            ...oldData.pages[oldData.pages.length - 1]!,
            messages: [
              ...oldData.pages[oldData.pages.length - 1]!.messages,
              newMessage,
            ]
          }
        ]
      };
    });
  };

  const updateMessage = (messageId: string, properties: Partial<Omit<TimelineMessageDto, "id" | "type" | "conversationId">>) => {
    modifyMessageData((oldData: InfiniteData<TimelineMessagePage | null | undefined>): InfiniteData<TimelineMessagePage | null | undefined> => {
      let hasMessage = false;
      for (const page of oldData.pages) {
        if (!page) continue;

        hasMessage = page.messages.some(m => m.id === messageId);
        if (hasMessage) break;
      }

      if (!hasMessage) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
          if (!page || !page.messages.some(m => m.id === messageId)) {
            return page;
          }

          return {
            ...page,
            messages: page.messages.map(m => m.id === messageId ?
              {...m, ...properties} :
              m
            ),
          };
        }),
      };
    });
  };

  const deleteMessage = (messageId: string) => {
    modifyMessageData((oldData: InfiniteData<TimelineMessagePage | null | undefined>): InfiniteData<TimelineMessagePage | null | undefined> => {
      let isMessageFound = false;
      for (const page of oldData.pages) {
        if (!page) continue;

        isMessageFound = page.messages.some(m => m.id === messageId);
        if (isMessageFound) break;
      }

      if (!isMessageFound) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
          if (!page || !page.messages.some(m => m.id === messageId)) {
            return page;
          }

          return {
            ...page,
            messages: page.messages.filter(m => m.id !== messageId),
          };
        }),
      };
    });
  };

  return {
    appendMessage,
    updateMessage,
    deleteMessage,
  };
}