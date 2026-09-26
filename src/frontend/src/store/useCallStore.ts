import { create } from 'zustand';

interface CallStoreType {
  calls: number[];
  addCall: (value: number) => void;
}

export const useCallStore = create<CallStoreType>((set) => ({
  calls: [],
  addCall: (value: number) => set((state) => ({ calls: [...state.calls, value] })),
}));