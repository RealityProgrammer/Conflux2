import { create } from 'zustand';
import type { UserIdentityProfileDto } from "../api/types.ts";

type BaseCall = {
  id: string;
  state: "dialing" | "canceled" | "active" | "rejected" | "dropped" | "ended";
}

export type OutgoingDirectCall = BaseCall & {
  type: "outgoing_direct";
  calleeProfile: UserIdentityProfileDto;
}

export type IncomingDirectCall = BaseCall & {
  type: "incoming_direct";
  callerProfile: UserIdentityProfileDto;
}

export type Call = OutgoingDirectCall | IncomingDirectCall;

interface CallStoreType {
  call: Call | null;
  startOutgoingDirectCall: (callId: string, calleeProfile: UserIdentityProfileDto) => void;
  startIncomingDirectCall: (callId: string, callerProfile: UserIdentityProfileDto) => void;
  updateCallState: (callId: string, state: BaseCall["state"]) => void;
  endCall: (callId: string) => void;
}

export const useCallStore = create<CallStoreType>((set) => ({
  call: null,

  startOutgoingDirectCall: (callId: string, calleeProfile: UserIdentityProfileDto) => set(() => ({
    call: { type: "outgoing_direct", state: "dialing", id: callId, calleeProfile },
  })),

  startIncomingDirectCall: (callId: string, callerProfile: UserIdentityProfileDto) => set(() => ({
    call: { type: "incoming_direct", state: "dialing", id: callId, callerProfile }
  })),

  updateCallState: (callId: string, newState: BaseCall["state"]) => set((state) => {
    if (state.call?.id === callId) {
      return { call: { ...state.call, state: newState, } };
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