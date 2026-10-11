import type {MessageInput} from "../components/chat/ChatInput.tsx";
import { create } from 'zustand';

export type SendMessageOperation = {
  id: string;
  input: MessageInput;
  conversationId: string;
  idempotencyKey: string;
  error: boolean;
};

export type EditMessageOperation = {
  newBody: string | null;
  error: boolean;
}

interface MessageOperationStoreType {
  sendOperations: SendMessageOperation[];
  editOperations: Record<string, EditMessageOperation>;
  deletingMessageIds: string[];

  addSendOperation: (operation: SendMessageOperation) => void;
  updateSendOperation: (operationId: string, error: boolean) => void;
  removeSendOperation: (operationId: string) => void;

  addEditOperation: (messageId: string, newBody: string | null) => void;
  updateEditOperation: (messageId: string, error: boolean) => void;
  removeEditOperation: (messageId: string) => void;

  addDeletingMessage: (messageId: string) => void;
  removeDeletingMessage: (messageId: string) => void;
}

export const useMessageOperationsStore = create<MessageOperationStoreType>((set) => ({
  sendOperations: [],
  editOperations: {},
  deletingMessageIds: [],

  addSendOperation: (operation: SendMessageOperation) => set((state) => {
    const isRetry = state.sendOperations.some(op => op.id === operation.id && op.error);

    if (isRetry) {
      return {
        sendOperations: state.sendOperations.map(op =>
          op.id === operation.id ? { ...op, error: false } : op,
        ),
      };
    }

    return {
      sendOperations: [
        ...state.sendOperations,
        operation,
      ],
    };
  }),

  updateSendOperation: (operationId: string, error: boolean) => set((state) => ({
    sendOperations: state.sendOperations.map((op) =>
      op.id === operationId ? { ...op, error } : op
    ),
  })),

  removeSendOperation: (operationId: string) => set((state) => {
    if (!state.sendOperations.some(op => op.id === operationId)) {
      return state;
    }

    return {
      sendOperations: state.sendOperations.filter(op => op.id !== operationId),
    };
  }),

  addEditOperation: (messageId: string, newBody: string | null) => set((state) => ({
    editOperations: {
      ...state.editOperations,
      [messageId]: { newBody, error: false },
    },
  })),

  updateEditOperation: (messageId: string, error: boolean) => set((state) => {
    const op = state.editOperations[messageId];
    if (!op) return state;
    return {
      editOperations: {
        ...state.editOperations,
        [messageId]: { ...op, error },
      },
    };
  }),

  removeEditOperation: (messageId) => set((state) => {
    const next = { ...state.editOperations };
    delete next[messageId];
    return { editOperations: next };
  }),

  addDeletingMessage: (messageId) => set((state) => ({
    deletingMessageIds: [...state.deletingMessageIds, messageId],
  })),

  removeDeletingMessage: (messageId) => set((state) => ({
    deletingMessageIds: state.deletingMessageIds.filter((id) => id !== messageId),
  })),
}));