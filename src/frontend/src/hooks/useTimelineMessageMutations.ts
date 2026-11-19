import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import type { EditedMessageDto, TimelineMessageDto, TimelineMessagePage } from "../api/types.ts";
import useQueryTimelineMessages from "./useQueryTimelineMessages.ts";

interface UseTimelineMessagesResult {
  appendMessage: (message: TimelineMessageDto) => void;
  updateMessage: (messageId: string, properties: EditedMessageDto) => void;
  updatePinStatus: (messageId: string, isPinned: boolean) => void;
  deleteMessage: (messageId: string) => void;
  updateReactionsCounts: (messageId: string, reactionsCounts: Record<string, number>) => void;
  updateUserReactionKeys: (messageId: string, updater: (previous: string[]) => string[]) => void;
}

export default function useTimelineMessageMutations(conversationId: string): UseTimelineMessagesResult {
  const queryClient = useQueryClient();

  const modifyMessageData = (
    callback: (
      oldData: InfiniteData<TimelineMessagePage | null | undefined>,
    ) => InfiniteData<TimelineMessagePage | null | undefined>,
  ) => {
    queryClient.setQueriesData<InfiniteData<TimelineMessagePage | undefined | null>>(
      { queryKey: useQueryTimelineMessages.getKey(conversationId) },
      (
        oldData: NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined,
      ): NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return oldData;
        }

        return callback(oldData);
      },
    );
  };

  const appendMessage = (newMessage: TimelineMessageDto) => {
    modifyMessageData(
      (
        oldData: InfiniteData<TimelineMessagePage | null | undefined>,
      ): InfiniteData<TimelineMessagePage | null | undefined> => {
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
              messages: [...oldData.pages[oldData.pages.length - 1]!.messages, newMessage],
            },
          ],
        };
      },
    );
  };

  const updateMessage = (messageId: string, properties: EditedMessageDto) => {
    modifyMessageData(
      (
        oldData: InfiniteData<TimelineMessagePage | null | undefined>,
      ): InfiniteData<TimelineMessagePage | null | undefined> => {
        let hasMessage = false;
        for (const page of oldData.pages) {
          if (!page) continue;

          hasMessage = page.messages.some((m) => m.id === messageId);
          if (hasMessage) break;
        }

        if (!hasMessage) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
            if (!page || !page.messages.some((m) => m.id === messageId)) {
              return page;
            }

            return {
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      body: properties.newBody,
                      attachments: properties.attachments,
                    }
                  : m,
              ),
            };
          }),
        };
      },
    );
  };

  const updatePinStatus = (messageId: string, isPinned: boolean) => {
    modifyMessageData(
      (
        oldData: InfiniteData<TimelineMessagePage | null | undefined>,
      ): InfiniteData<TimelineMessagePage | null | undefined> => {
        let hasMessage = false;
        for (const page of oldData.pages) {
          if (!page) continue;

          hasMessage = page.messages.some((m) => m.id === messageId);
          if (hasMessage) break;
        }

        if (!hasMessage) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
            if (!page || !page.messages.some((m) => m.id === messageId)) {
              return page;
            }

            return {
              ...page,
              messages: page.messages.map((m) => (m.id === messageId ? { ...m, isPinned } : m)),
            };
          }),
        };
      },
    );
  };

  const deleteMessage = (messageId: string) => {
    modifyMessageData(
      (
        oldData: InfiniteData<TimelineMessagePage | null | undefined>,
      ): InfiniteData<TimelineMessagePage | null | undefined> => {
        let isMessageFound = false;
        for (const page of oldData.pages) {
          if (!page) continue;

          isMessageFound = page.messages.some((m) => m.id === messageId);
          if (isMessageFound) break;
        }

        if (!isMessageFound) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
            if (!page || !page.messages.some((m) => m.id === messageId)) {
              return page;
            }

            return {
              ...page,
              messages: page.messages.filter((m) => m.id !== messageId),
            };
          }),
        };
      },
    );
  };

  const updateReactionsCounts = (messageId: string, reactionsCounts: Record<string, number>) => {
    modifyMessageData(
      (
        oldData: InfiniteData<TimelineMessagePage | null | undefined>,
      ): InfiniteData<TimelineMessagePage | null | undefined> => {
        let hasMessage = false;
        for (const page of oldData.pages) {
          if (!page) continue;

          hasMessage = page.messages.some((m) => m.id === messageId);
          if (hasMessage) break;
        }

        if (!hasMessage) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
            if (!page || !page.messages.some((m) => m.id === messageId)) {
              return page;
            }

            return {
              ...page,
              messages: page.messages.map((m) => (m.id === messageId ? { ...m, reactionsCounts } : m)),
            };
          }),
        };
      },
    );
  };

  const updateUserReactionKeys = (messageId: string, updater: (previous: string[]) => string[]) => {
    modifyMessageData(
      (
        oldData: InfiniteData<TimelineMessagePage | null | undefined>,
      ): InfiniteData<TimelineMessagePage | null | undefined> => {
        let hasMessage = false;
        for (const page of oldData.pages) {
          if (!page) continue;

          hasMessage = page.messages.some((m) => m.id === messageId);
          if (hasMessage) break;
        }

        if (!hasMessage) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
            if (!page || !page.messages.some((m) => m.id === messageId)) {
              return page;
            }

            return {
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      userReactionKeys: updater(m.userReactionKeys ?? []),
                    }
                  : m,
              ),
            };
          }),
        };
      },
    );
  };

  return {
    appendMessage,
    updateMessage,
    updatePinStatus,
    deleteMessage,
    updateReactionsCounts,
    updateUserReactionKeys,
  };
}
