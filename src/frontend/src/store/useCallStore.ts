import { create } from 'zustand';
import type { UserIdentityProfileDto } from "../api/types.ts";

type BaseCall = {
  sessionId: string;  // keep sessionId just to prevent potential asynchronous issue
}

export type OutgoingDirectCallState = "dialing" | "active";

export type OutgoingDirectCall = BaseCall & {
  type: "outgoing_direct";
  state: OutgoingDirectCallState;
  calleeProfile: UserIdentityProfileDto;
}

export type IncomingDirectCallState = "incoming" | "active";

export type IncomingDirectCall = BaseCall & {
  type: "incoming_direct";
  state: IncomingDirectCallState;
  callerProfile: UserIdentityProfileDto;
}

export type Call = OutgoingDirectCall | IncomingDirectCall;

interface CallStoreType {
  call: Call | null;
  startOutgoingDirectCall: (calleeProfile: UserIdentityProfileDto) => void;
  startIncomingDirectCall: (callerProfile: UserIdentityProfileDto) => void;
  markCallAsActive: (callSessionId: string) => void;
  endCall: (callSessionId: string) => void;
  forceEndCall: () => void;
}

export const useCallStore = create<CallStoreType>((set) => ({
  call: null,

  startOutgoingDirectCall: (calleeProfile: UserIdentityProfileDto) => set(() => ({
    call: { type: "outgoing_direct", state: "dialing", sessionId: crypto.randomUUID(), calleeProfile },
  })),

  startIncomingDirectCall: (callerProfile: UserIdentityProfileDto) => set(() => ({
    call: { type: "incoming_direct", state: "incoming", sessionId: crypto.randomUUID(), callerProfile }
  })),

  markCallAsActive: (callSessionId: string) => set((state) => {
    if (state.call?.sessionId === callSessionId) {
      return { call: { ...state.call, state: "active" } };
    }
    return state;
  }),

  endCall: (callSessionId: string) => set((state) => {
    if (state.call?.sessionId === callSessionId) {
      return { call: null };
    }

    return state;
  }),

  forceEndCall: () => set({ call: null }),
}));