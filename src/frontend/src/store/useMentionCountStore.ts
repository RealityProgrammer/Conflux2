import { create } from 'zustand';

interface MentionCountStoreType {
  serverMentions: Record<string, number>;
  dmMentions: Record<string, number>;

  incrementServerMention: (serverId: string) => void;
  clearServerMentions: (serverId: string) => void;

  incrementDmMention: (conversationId: string) => void;
  clearDmMentions: (conversationId: string) => void;
}

export const useMentionStore = create<MentionCountStoreType>((set) => ({
  serverMentions: {},
  dmMentions: {},

  incrementServerMention: (serverId: string) => set((state) => ({
    serverMentions: {
      ...state.serverMentions,
      [serverId]: (state.serverMentions[serverId] || 0) + 1,
    }
  })),
  clearServerMentions: (serverId: string) => set((state) => {
    const next = { ...state.serverMentions };
    delete next[serverId];

    return next;
  }),
  incrementDmMention: (conversationId: string) => set((state) => ({
    dmMentions: {
      ...state.dmMentions,
      [conversationId]: (state.dmMentions[conversationId] || 0) + 1,
    }
  })),
  clearDmMentions: (conversationId: string) => set((state) => {
    const next = { ...state.dmMentions };
    delete next[conversationId];

    return next;
  }),
}));