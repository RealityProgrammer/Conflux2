import { create } from 'zustand';
import type {UserIdentityProfileDto} from "../api/types.ts";

export type DirectCallState = "initialize" | "initialize_error" | "dialing";

export type DirectCall = {
  type: "direct";
  state: DirectCallState;
  sessionId: string;
  calleeId: string;
  calleeProfile?: UserIdentityProfileDto;
}

interface CallStoreType {
  calls: DirectCall[];
  startDirectCall: (calleeUserId: string) => void;
  beginDialingDirectCall: (callSessionId: string, calleeProfile: UserIdentityProfileDto) => void;
  endCall: (callSessionId: string) => void;
}

export const useCallStore = create<CallStoreType>((set) => ({
  calls: [],
  startDirectCall: (calleeUserId: string) => set((state) => {
    return {
      calls: [
        ...state.calls,
        { type: "direct", state: "initialize", sessionId: crypto.randomUUID(), calleeId: calleeUserId },
      ],
    };
  }),
  endCall: (callSessionId: string) => set((state) => {
    return { calls: state.calls.filter(call => call.sessionId !== callSessionId) };
  }),
  beginDialingDirectCall: (callSessionId: string, calleeProfile: UserIdentityProfileDto) => set((state) => {
    return { calls: state.calls.map(call => call.sessionId === callSessionId ?
        { ...call, state: "dialing", calleeProfile } :
        call)
    };
  }),
}));