import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {RefreshResponse, ServiceResponse, UserAuthorizationInfo} from "../api/types.ts";

interface AuthState {
  cachedAuthorization: UserAuthorizationInfo | null;
  activeRefreshPromise: Promise<ServiceResponse<RefreshResponse>> | null;
  activeGetAuthorizationInfoPromise: Promise<ServiceResponse<UserAuthorizationInfo>> | null;
  hasSession: boolean;

  setCachedAuthorization: (auth: UserAuthorizationInfo | null) => void;
  setActiveRefreshPromise: (promise: Promise<ServiceResponse<RefreshResponse>> | null) => void;
  setActiveGetAuthorizationInfoPromise: (promise: Promise<ServiceResponse<UserAuthorizationInfo>> | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>(
  // @ts-ignore
  persist(
    (set) => ({
      cachedAuthorization: null,
      activeRefreshPromise: null,
      activeGetAuthorizationInfoPromise: null,
      hasSession: false,

      setCachedAuthorization: (auth) => set({ cachedAuthorization: auth, hasSession: true }),
      setActiveRefreshPromise: (promise) => set({ activeRefreshPromise: promise }),
      setActiveGetAuthorizationInfoPromise: (promise) => set({ activeGetAuthorizationInfoPromise: promise }),
      clearSession: () => {
        set({ cachedAuthorization: null, hasSession: false });
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        hasSession: state.hasSession,
      }),
    },
  )
)