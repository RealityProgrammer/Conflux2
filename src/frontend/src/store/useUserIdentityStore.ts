import { create } from "zustand";
import type { ServiceResponse, UserIdentityProfileDto } from "../api/types.ts";
import { userService } from "../api/userService.ts";

interface UserIdentityStoreType {
  identities: Record<string, UserIdentityProfileDto>;
  getUser: (userId: string) => UserIdentityProfileDto | undefined;
  setUsers: (identities: UserIdentityProfileDto[]) => void;
  fetchUser: (userId: string) => Promise<UserIdentityProfileDto | null>;
}

const batchQueue = new Set<string>();
const promiseResolvers = new Map<
  string,
  Array<(user: UserIdentityProfileDto | null) => void>
>();
let batchTimeout: number | null = null;
const BATCH_DELAY_MS = 50;
const MAX_IDS_PER_REQUEST = 40;

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export const useUserIdentityStore = create<UserIdentityStoreType>(
  (set, get) => ({
    identities: {},
    getUser: (userId: string): UserIdentityProfileDto | undefined => {
      return get().identities[userId];
    },
    setUsers: (identities: UserIdentityProfileDto[]) => {
      if (identities.length === 0) return;

      set((state) => {
        const result = { ...state.identities };
        identities.forEach((u) => {
          result[u.id] = u;
        });

        return { identities: result };
      });
    },

    fetchUser: (userId: string): Promise<UserIdentityProfileDto | null> => {
      return new Promise((resolve) => {
        const state = get();

        // 1. If already cached in store, resolve immediately
        if (state.identities[userId]) {
          resolve(state.identities[userId]);
          return;
        }

        // 2. Register promise resolver
        if (!promiseResolvers.has(userId)) {
          promiseResolvers.set(userId, []);
        }
        promiseResolvers.get(userId)!.push(resolve);

        // 3. Add to batch queue
        batchQueue.add(userId);

        // 4. Set debounce timer
        if (!batchTimeout) {
          batchTimeout = setTimeout(async () => {
            const allIdsToFetch = Array.from(batchQueue);
            batchQueue.clear();
            batchTimeout = null;

            if (allIdsToFetch.length === 0) return;

            // Split into safe chunks of maximum 40 IDs per request
            const idChunks = chunkArray(allIdsToFetch, MAX_IDS_PER_REQUEST);

            // Execute chunked POST requests concurrently
            await Promise.all(
              idChunks.map(async (chunk) => {
                try {
                  const response: ServiceResponse<UserIdentityProfileDto[]> =
                    await userService.getIdentities(chunk);
                  const fetchedUsers = response.data || [];

                  // Update store state
                  set((currentState) => {
                    const nextUsers = { ...currentState.identities };

                    fetchedUsers.forEach((user) => {
                      nextUsers[user.id] = user;
                    });
                    return { identities: nextUsers };
                  });

                  // Resolve matching promises
                  fetchedUsers.forEach((user) => {
                    const resolvers = promiseResolvers.get(user.id);
                    resolvers?.forEach((cb) => cb(user));
                    promiseResolvers.delete(user.id);
                  });

                  // Resolve missing IDs in this chunk as null
                  chunk.forEach((id) => {
                    if (promiseResolvers.has(id)) {
                      const resolvers = promiseResolvers.get(id);
                      resolvers?.forEach((cb) => cb(null));
                      promiseResolvers.delete(id);
                    }
                  });
                } catch (err) {
                  console.error("Failed to fetch user identities chunk:", err);
                  chunk.forEach((id) => {
                    const resolvers = promiseResolvers.get(id);
                    resolvers?.forEach((cb) => cb(null));
                    promiseResolvers.delete(id);
                  });
                }
              }),
            );
          }, BATCH_DELAY_MS);
        }
      });
    },
  }),
);
