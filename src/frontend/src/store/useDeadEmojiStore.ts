import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DeadEmojiState {
  deadEmojiIds: string[];
  markAsDead: (id: string) => void;
  isDead: (id: string) => boolean;
}

export const useDeadEmojiStore = create<DeadEmojiState>()(
  persist(
    (set, get) => ({
      deadEmojiIds: [],

      markAsDead: (id: string) => {
        const { deadEmojiIds } = get();
        if (!deadEmojiIds.includes(id)) {
          set({ deadEmojiIds: [...deadEmojiIds, id] });
        }
      },

      isDead: (id: string) => {
        return get().deadEmojiIds.includes(id);
      },
    }),
    {
      name: 'dead-emojis-cache-store',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);