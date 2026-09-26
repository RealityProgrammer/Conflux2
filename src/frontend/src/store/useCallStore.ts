import { create } from 'zustand';

// dialing: WebRTC doing routing stuffs trying to reach the callee or the call conversation
// ringing: waiting for callee to accept the call, no use if the call is already started between multiple users
// accepting: callee accepted the call, initializing the call room
// on_call: is on call
// should i add "rejected" state?
type CallState = "init" | "init_error" | "dialing" | "ringing" | "accepting" | "on_call";

export type DirectCall = {
  type: "direct";
  state: CallState;
  sessionId: string;
  calleeId: string;
}

interface CallStoreType {
  calls: DirectCall[];
  startDirectCall: (calleeUserId: string) => void;
  updateCallState: (callSessionId: string, value: CallState) => void;
  endCall: (callSessionId: string) => void;
}

export const useCallStore = create<CallStoreType>((set) => ({
  calls: [],
  startDirectCall: (calleeUserId: string) => set((state) => {
    return {
      calls: [
        ...state.calls,
        { type: "direct", state: "init", sessionId: crypto.randomUUID(), calleeId: calleeUserId },
      ],
    };
  }),
  updateCallState: (callSessionId: string, value: CallState) => set((state) => {
    return { calls: state.calls.map(call => call.sessionId === callSessionId ? { ...call, state: value } : call) };
  }),
  endCall: (callSessionId: string) => set((state) => {
    return { calls: state.calls.filter(call => call.sessionId !== callSessionId) };
  })
}));