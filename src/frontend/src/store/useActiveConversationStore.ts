import { create } from "zustand";

interface ConversationIdStoreType {
  activeConversationId: string | null;
  setActiveConversationId: (conversationId: string | null) => void;
}

export const useActiveConversationStore = create<ConversationIdStoreType>(
  (set) => ({
    activeConversationId: null,
    setActiveConversationId: (conversationId: string | null) =>
      set(() => ({
        activeConversationId: conversationId,
      })),
  }),
);
