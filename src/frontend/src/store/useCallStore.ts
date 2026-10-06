import { create } from 'zustand';
import type { UserIdentityProfileDto } from "../api/types.ts";

type BaseCall = {
  id: string;
}

export type OutgoingDirectCallState = "dialing" | "active" | "dropped" | "ended";

export type OutgoingDirectCall = BaseCall & {
  type: "outgoing_direct";
  state: OutgoingDirectCallState;
  calleeProfile: UserIdentityProfileDto;
}

export type IncomingDirectCallState = "incoming" | "active" | "dropped" | "ended";

export type IncomingDirectCall = BaseCall & {
  type: "incoming_direct";
  state: IncomingDirectCallState;
  callerProfile: UserIdentityProfileDto;
}

export type Call = OutgoingDirectCall | IncomingDirectCall;

interface CallStoreType {
  call: Call | null;
  startOutgoingDirectCall: (callId: string, calleeProfile: UserIdentityProfileDto) => void;
  startIncomingDirectCall: (callId: string, callerProfile: UserIdentityProfileDto) => void;
  markCallAsActive: (callId: string) => void;
  markCallAsDropped: (callSessionId: string) => void;
  markCallAsEnded: (callSessionId: string) => void;
  endCall: (callSessionId: string) => void;
}

export const useCallStore = create<CallStoreType>((set) => ({
  call: null,

  startOutgoingDirectCall: (callId: string, calleeProfile: UserIdentityProfileDto) => set(() => ({
    call: { type: "outgoing_direct", state: "dialing", id: callId, calleeProfile },
  })),

  startIncomingDirectCall: (callId: string, callerProfile: UserIdentityProfileDto) => set(() => ({
    call: { type: "incoming_direct", state: "incoming", id: callId, callerProfile }
  })),

  markCallAsActive: (callId: string) => set((state) => {
    if (state.call?.id === callId) {
      return { call: { ...state.call, state: "active" } };
    }

    return state;
  }),

  markCallAsDropped: (callId: string) => set((state) => {
    if (state.call?.id === callId) {
      return { call: { ...state.call, state: "dropped" } };
    }
    return state;
  }),

  markCallAsEnded: (callId: string) => set((state) => {
    if (state.call?.id === callId) {
      return { call: { ...state.call, state: "ended" } };
    }
    return state;
  }),

  endCall: (callId: string) => set((state) => {
    if (state.call?.id === callId) {
      return { call: null };
    }

    return state;
  }),
}));