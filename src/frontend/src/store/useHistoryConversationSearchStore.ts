import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DateTimeRange } from "../components/DateTimeRangePicker.tsx";
import type { MessagePinFilter } from "../api/schema.ts";

export interface SearchRequest {
  content: string;
  senderIds: string[];
  timeRange?: DateTimeRange;
  pin: MessagePinFilter;
}

function areSenderIdsEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) return false;

  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();

  return sorted1.every((val, index) => val === sorted2[index]);
}

function areTimeRangesEqual(
  range1?: DateTimeRange,
  range2?: DateTimeRange,
): boolean {
  if (range1 === range2) return true;
  if (!range1 || !range2) return false;

  const start1 =
    range1.start instanceof Date ? range1.start.getTime() : range1.start;
  const start2 =
    range2.start instanceof Date ? range2.start.getTime() : range2.start;
  const end1 = range1.end instanceof Date ? range1.end.getTime() : range1.end;
  const end2 = range2.end instanceof Date ? range2.end.getTime() : range2.end;

  return start1 === start2 && end1 === end2;
}

export function areSearchRequestsEqual(
  req1: SearchRequest,
  req2: SearchRequest,
): boolean {
  if (req1 === req2) return true;

  if (req1.content !== req2.content) return false;
  if (!areSenderIdsEqual(req1.senderIds, req2.senderIds)) return false;
  if (!areTimeRangesEqual(req1.timeRange, req2.timeRange)) return false;
  if (req1.pin !== req2.pin) return false;

  return true;
}

interface HistoryConversationSearchStoreType {
  searchHistory: Record<string, SearchRequest[]>;

  registerSearchRequest: (
    conversationId: string,
    request: SearchRequest,
  ) => void;
  removeSearchRequest: (conversationId: string, index: number) => void;
}

export const useHistoryConversationSearchStore =
  create<HistoryConversationSearchStoreType>(
    // @ts-ignore
    persist(
      (set, get) => ({
        searchHistory: {},

        registerSearchRequest: (
          conversationId: string,
          request: SearchRequest,
        ) => {
          const currentHistory = get().searchHistory[conversationId] ?? [];
          const filteredHistory = currentHistory.filter(
            (item) => !areSearchRequestsEqual(item, request),
          );
          const newHistory = [request, ...filteredHistory].slice(0, 5);

          set({
            searchHistory: {
              ...get().searchHistory,
              [conversationId]: newHistory,
            },
          });
        },

        removeSearchRequest: (conversationId: string, index: number) => {
          const currentHistory = get().searchHistory[conversationId] ?? [];
          const filtered = currentHistory.filter((_value, i) => i !== index);

          set({
            searchHistory: {
              ...get().searchHistory,
              [conversationId]: filtered,
            },
          });
        },
      }),
      {
        name: "conversation-search-history",
        partialize: (state) => ({
          searchHistory: state.searchHistory,
        }),
        version: 1,
      },
    ),
  );
