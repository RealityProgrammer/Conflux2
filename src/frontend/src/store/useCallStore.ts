import { create } from 'zustand';
import type {UserIdentityProfileDto} from "../api/types.ts";

type BaseCall = {
  sessionId: string;
}

export type OutgoingDirectCallState = "dialing" | "connected";

export type OutgoingDirectCall = BaseCall & {
  type: "outgoing_direct";
  state: OutgoingDirectCallState;
  calleeProfile: UserIdentityProfileDto;
}

export type IncomingDirectCallState = "incoming" | "accepting" | "connected";

export type IncomingDirectCall = BaseCall & {
  type: "incoming_direct";
  state: IncomingDirectCallState;
  callerProfile: UserIdentityProfileDto;
}

export type Call = OutgoingDirectCall | IncomingDirectCall;

interface CallStoreType {
  calls: Call[];
  startOutgoingDirectCall: (calleeProfile: UserIdentityProfileDto) => void;
  startIncomingDirectCall: (callerProfile: UserIdentityProfileDto) => void;
  markCallAsConnected: (callSessionId: string) => void;
  endCall: (callSessionId: string) => void;
}

export const useCallStore = create<CallStoreType>((set) => ({
  calls: [],
  startOutgoingDirectCall: (calleeProfile: UserIdentityProfileDto) => set((state) => {
    return {
      calls: [
        ...state.calls,
        { type: "outgoing_direct", state: "dialing", sessionId: crypto.randomUUID(), calleeProfile, },
      ],
    };
  }),
  startIncomingDirectCall: (callerProfile: UserIdentityProfileDto)  => set((state) => {
    return {
      calls: [
        ...state.calls,
        { type: "incoming_direct", state: "incoming", sessionId: crypto.randomUUID(), callerProfile, }
      ]
    }
  }),
  markCallAsConnected: (callSessionId: string) => set((state) => {
    return {
      calls: state.calls.map((call) => call.sessionId === callSessionId ?
        { ...call, state: "connected" } :
        call
      ),
    };
  }),
  endCall: (callSessionId: string) => set((state) => {
    return { calls: state.calls.filter(call => call.sessionId !== callSessionId) };
  }),
}));