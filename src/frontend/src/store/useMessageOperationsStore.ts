import type {MessageInput} from "../components/chat/ChatInput.tsx";
import { create } from 'zustand';

export type MessageOperationError =
  { type: "unknown" } |
  { type: "network" } |
  { type: "validation", fields: Record<string, string[]>; };

export type SendMessageOperation = {
  id: string;
  input: MessageInput;
  conversationId: string;
  idempotencyKey: string;
  error?: MessageOperationError;
};

export type EditMessageOperation = {
  newBody: string | null;
  removeAttachmentIds: string[];
  newAttachments: File[];
  error?: MessageOperationError;
}

interface MessageOperationStoreType {
  sendOperations: SendMessageOperation[];
  editOperations: Record<string, EditMessageOperation>;
  deletingMessageIds: string[];

  addSendOperation: (operation: SendMessageOperation) => void;
  setSendOperationError: (operationId: string, error: NonNullable<MessageOperationError>) => void;
  removeSendOperation: (operationId: string) => void;

  addEditOperation: (messageId: string, newBody: string | null, removeAttachmentIds: string[], newAttachments: File[]) => void;
  setEditOperationError: (messageId: string, error: NonNullable<MessageOperationError>) => void;
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
          op.id === operation.id ? { ...op, error: undefined } : op,
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

  setSendOperationError: (operationId: string, error: NonNullable<MessageOperationError>) => set((state) => ({
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

  addEditOperation: (messageId: string, newBody: string | null, removeAttachmentIds: string[], newAttachments: File[]) => set((state) => ({
    editOperations: {
      ...state.editOperations,
      [messageId]: { newBody, removeAttachmentIds, newAttachments, error: undefined },
    },
  })),

  setEditOperationError: (messageId: string, error: NonNullable<MessageOperationError>) => set((state) => {
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