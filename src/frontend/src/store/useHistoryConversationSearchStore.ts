import {create} from "zustand";
import { persist } from "zustand/middleware";

interface HistoryConversationSearchStoreType {
  searchHistory: Record<string, string[]>;

  setSearchHistory: (conversationId: string, query: string) => void;
}

export const useHistoryConversationSearchStore = create<HistoryConversationSearchStoreType>(
  // @ts-ignore
  persist(
    (set, get) => ({
      searchHistory: {},

      setSearchHistory: (conversationId: string, query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;

        const currentHistory = get().searchHistory[conversationId] ?? [];
        const filteredHistory = currentHistory.filter((item) => item !== trimmedQuery);
        const newHistory = [trimmedQuery, ...filteredHistory].slice(0, 5);

        set({
          searchHistory: {
            ...get().searchHistory,
            [conversationId]: newHistory,
          }
        });
      },
    }),
    {
      name: "conversation-search-history",
      partialize: (state) => ({
        searchHistory: state.searchHistory
      }),
      version: 0,
    }
  )
);