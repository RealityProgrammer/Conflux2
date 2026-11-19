import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { conversationService } from "../api/conversationService.ts";
import type { TimelineMessagePage } from "../api/types.ts";
import useQueryTimelineMessages from "./useQueryTimelineMessages.ts";

interface UseMessageReactionMutationVariables {
  conversationId: string;
  messageId: string;
  reactionKey: Parameters<typeof conversationService.toggleReaction>[2];
  action: "add" | "remove";
}

type ReactionsSnapshot = {
  reactionsCounts: Record<string, number> | null;
  userReactionKeys: string[] | null;
};

type OnMutateResult = {
  reactionsSnapshot: ReactionsSnapshot | null;
};

export default function useMessageReactionMutation(
  options: Omit<
    UseMutationOptions<void, Error, UseMessageReactionMutationVariables, unknown>,
    "mutationFn" | "mutationKey" | "onMutate"
  >,
) {
  const queryClient = useQueryClient();

  const { onError, ...otherOptions } = options;

  return useMutation<void, Error, UseMessageReactionMutationVariables, OnMutateResult>({
    mutationKey: useMessageReactionMutation.key,
    mutationFn: async ({
      conversationId,
      messageId,
      reactionKey,
      action,
    }: UseMessageReactionMutationVariables): Promise<void> => {
      return await conversationService.toggleReaction(conversationId, messageId, reactionKey, action);
    },
    onMutate: ({
      conversationId,
      messageId,
      reactionKey,
      action,
    }: UseMessageReactionMutationVariables): OnMutateResult => {
      queryClient.cancelQueries({
        queryKey: useQueryTimelineMessages.getKey(conversationId),
      });

      let previousSnapshot: ReactionsSnapshot | null = null;

      queryClient.setQueriesData<InfiniteData<TimelineMessagePage | undefined | null>>(
        { queryKey: useQueryTimelineMessages.getKey(conversationId) },
        (
          oldData: NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined,
        ): NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined => {
          if (!oldData || !oldData.pages || oldData.pages.length === 0) {
            return oldData;
          }

          return {
            ...oldData,
            pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
              if (!page || !page.messages.some((m) => m.id === messageId)) {
                return page;
              }

              return {
                ...page,
                messages: page.messages.map((msg) => {
                  if (msg.id !== messageId) return msg;

                  // save the snapshot to revert when failure happen
                  previousSnapshot = {
                    reactionsCounts: msg.reactionsCounts,
                    userReactionKeys: msg.userReactionKeys,
                  };

                  const counts = { ...(msg.reactionsCounts || {}) };
                  let userKeys = [...(msg.userReactionKeys || [])];
                  const currentCount = counts[reactionKey] || 0;

                  if (action === "add") {
                    counts[reactionKey] = currentCount + 1;

                    if (!userKeys.includes(reactionKey)) userKeys.push(reactionKey);
                  } else {
                    const newCount = currentCount - 1;

                    if (newCount <= 0) {
                      delete counts[reactionKey];
                    } else {
                      counts[reactionKey] = newCount;
                    }

                    userKeys = userKeys.filter((k) => k !== reactionKey);
                  }

                  return {
                    ...msg,
                    reactionsCounts: counts,
                    userReactionKeys: userKeys,
                  };
                }),
              };
            }),
          };
        },
      );

      return { reactionsSnapshot: previousSnapshot };
    },
    onError: (
      error: Error,
      variables: UseMessageReactionMutationVariables,
      onMutateResult: OnMutateResult | undefined,
      context,
    ) => {
      if (onMutateResult && onMutateResult.reactionsSnapshot) {
        const { conversationId, messageId } = variables;

        queryClient.setQueriesData<InfiniteData<TimelineMessagePage | undefined | null>>(
          { queryKey: useQueryTimelineMessages.getKey(conversationId) },
          (
            oldData: NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined,
          ): NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined => {
            if (!oldData || !oldData.pages || oldData.pages.length === 0) {
              return oldData;
            }

            return {
              ...oldData,
              pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
                if (!page || !page.messages.some((m) => m.id === messageId)) {
                  return page;
                }

                return {
                  ...page,
                  messages: page.messages.map((msg) => {
                    if (msg.id !== messageId) return msg;

                    return {
                      ...msg,
                      reactionsCounts: onMutateResult!.reactionsSnapshot!.reactionsCounts,
                      userReactionKeys: onMutateResult!.reactionsSnapshot!.userReactionKeys,
                    };
                  }),
                };
              }),
            };
          },
        );
      }

      onError?.(error, variables, onMutateResult, context);
    },

    ...otherOptions,
  });
}

useMessageReactionMutation.key = ["useMessageReactionMutation"];
