import { create } from 'zustand';

interface MentionCountStoreType {
  serverMentions: Record<string, Record<string, number>>; // Record<serverId, Record<channelId, number>>
  dmMentions: Record<string, number>; // Record<peerUserId, number>

  incrementServerMention: (serverId: string, channelId: string) => void;
  clearServerMentions: (serverId: string) => void;
  clearServerChannelMentions: (serverId: string, channelId: string) => void;

  incrementDmMention: (peerUserId: string) => void;
  clearDmMentions: (peerUserId: string) => void;
}

export const useMentionCountStore = create<MentionCountStoreType>((set) => ({
  serverMentions: {},
  dmMentions: {},

  incrementServerMention: (serverId: string, channelId: string) => set((state) => {
    const existingChannels = state.serverMentions[serverId] || {};

    return {
      serverMentions: {
        ...state.serverMentions,
        [serverId]: {
          ...existingChannels,
          [channelId]: (existingChannels[channelId] || 0) + 1,
        },
      },
    };
  }),
  clearServerMentions: (serverId: string) => set((state) => {
    if (!state.serverMentions[serverId]) return state;

    const next = { ...state.serverMentions };
    delete next[serverId];
    return next;
  }),
  clearServerChannelMentions: (serverId: string, channelId: string) => set((state) => {
    const serverChannels = state.serverMentions[serverId];
    if (!serverChannels || serverChannels[channelId] === undefined) {
      return state;
    }

    const nextChannels = { ...serverChannels };
    delete nextChannels[channelId];

    const nextServerMentions = { ...state.serverMentions };

    if (Object.keys(nextChannels).length === 0) {
      delete nextServerMentions[serverId];
    } else {
      nextServerMentions[serverId] = nextChannels;
    }

    return { serverMentions: nextServerMentions };
  }),

  incrementDmMention: (peerUserId: string) => set((state) => ({
    dmMentions: {
      ...state.dmMentions,
      [peerUserId]: (state.dmMentions[peerUserId] || 0) + 1,
    }
  })),
  clearDmMentions: (peerUserId: string) => set((state) => {
    if (!state.dmMentions[peerUserId]) return state;

    const next = { ...state.dmMentions };
    delete next[peerUserId];
    return { dmMentions: next };
  }),
}));