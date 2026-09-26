import { create } from 'zustand';
import type {UserIdentityProfileDto} from "../api/types.ts";

type BaseCall = {
  sessionId: string;
}

export type OutgoingDirectCallState = "initialize" | "initialize_error" | "dialing" | "connected";

export type OutgoingDirectCall = BaseCall & {
  type: "outgoing_direct";
  state: OutgoingDirectCallState;
  calleeId: string;
  calleeProfile?: UserIdentityProfileDto;
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
  startOutgoingDirectCall: (calleeUserId: string) => void;
  startIncomingDirectCall: (callerProfile: UserIdentityProfileDto) => void;
  beginDialingDirectCall: (callSessionId: string, calleeProfile: UserIdentityProfileDto) => void;
  endCall: (callSessionId: string) => void;
}

export const useCallStore = create<CallStoreType>((set) => ({
  calls: [],
  startOutgoingDirectCall: (calleeUserId: string) => set((state) => {
    return {
      calls: [
        ...state.calls,
        { type: "outgoing_direct", state: "initialize", sessionId: crypto.randomUUID(), calleeId: calleeUserId },
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
  endCall: (callSessionId: string) => set((state) => {
    return { calls: state.calls.filter(call => call.sessionId !== callSessionId) };
  }),
  beginDialingDirectCall: (callSessionId: string, calleeProfile: UserIdentityProfileDto) => set((state) => {
    return {
      calls: state.calls.map(call => call.type === "outgoing_direct" && call.state === "initialize" && call.sessionId === callSessionId ?
        { ...call, state: "dialing", calleeProfile } :
        call
      )
    };
  }),
}));