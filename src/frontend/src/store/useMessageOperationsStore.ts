import { create } from 'zustand';

export type MessageSendInput = {
  body: string | null;
  attachments: File[];
  replyingMessageId: string | null;
}

export type MessageEditInput = {
  body?: string | null;
  removeAttachmentIds?: string[];
  addAttachments?: File[];
}

export type MessageOperationError =
  | { type: "validation", messages: string[]; }
  | { type: "forbidden", message: string; }
  | { type: "network" }
  | { type: "unknown" }
  | { type: "server" };

export type SendOperation = {
  input: MessageSendInput;
  conversationId: string;
  idempotencyKey: string;
  error?: MessageOperationError;
};

export type EditOperation = {
  input: MessageEditInput;
  error?: MessageOperationError;
}

interface MessageOperationStoreType {
  sendOperationsByConversation: Record<string, SendOperation[]>;
  editOperationsByConversation: Record<string, Record<string, EditOperation>>;
  deletingMessageIdsByConversation: Record<string, Set<string>>;

  addSendOperation: (conversationId: string, operation: SendOperation) => void;
  setSendOperationError: (conversationId: string, operationIdempotencyKey: string, error?: MessageOperationError) => void;
  removeSendOperation: (conversationId: string, operationIdempotencyKey: string) => void;

  addEditOperation: (conversationId: string, messageId: string, input: MessageEditInput) => void;
  setEditOperationError: (conversationId: string, messageId: string, error?: MessageOperationError) => void;
  removeEditOperation: (conversationId: string, messageId: string) => void;

  addDeletingMessage: (conversationId: string, messageId: string) => void;
  removeDeletingMessage: (conversationId: string, messageId: string) => void;
}

export const useMessageOperationsStore = create<MessageOperationStoreType>((set) => ({
  sendOperationsByConversation: {},
  editOperationsByConversation: {},
  deletingMessageIdsByConversation: {},

  addSendOperation: (conversationId: string, operation: SendOperation) => set((state) => {
    const currentList = state.sendOperationsByConversation[conversationId] || [];
    const existingIndex = currentList.findIndex(op => op.idempotencyKey === operation.idempotencyKey);

    let updatedList: SendOperation[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = { ...operation, error: undefined };
    } else {
      updatedList = [...currentList, operation];
    }

    return {
      sendOperationsByConversation: {
        ...state.sendOperationsByConversation,
        [conversationId]: updatedList,
      }
    };
  }),

  setSendOperationError: (conversationId: string, operationIdempotencyKey: string, error?: MessageOperationError) => set((state) => {
    return {
      sendOperationsByConversation: {
        ...state.sendOperationsByConversation,
        [conversationId]: (state.sendOperationsByConversation[conversationId] || []).map((op) =>
          op.idempotencyKey === operationIdempotencyKey ? { ...op, error } : op
        ),
      },
    };
  }),

  removeSendOperation: (conversationId: string, operationIdempotencyKey: string) => set((state) => {
    return {
      sendOperationsByConversation: {
        ...state.sendOperationsByConversation,
        [conversationId]: (state.sendOperationsByConversation[conversationId] || []).filter(
          (op) => op.idempotencyKey !== operationIdempotencyKey
        ),
      },
    };
  }),

  addEditOperation: (conversationId: string, messageId: string, input: MessageEditInput) => set((state) => {
    return {
      editOperationsByConversation: {
        ...state.editOperationsByConversation,
        [conversationId]: {
          ...(state.editOperationsByConversation[conversationId] || {}),
          [messageId]: { input, },
        },
      }
    }
  }),

  setEditOperationError: (conversationId: string, messageId: string, error?: MessageOperationError) => set((state) => {
    const convEdits = state.editOperationsByConversation[conversationId];
    if (!convEdits || !convEdits[messageId]) return state;

    return {
      editOperationsByConversation: {
        ...state.editOperationsByConversation,
        [conversationId]: {
          ...convEdits,
          [messageId]: { ...convEdits[messageId], error },
        },
      },
    };
  }),

  removeEditOperation: (conversationId: string, messageId: string) => set((state) => {
    const convEdits = state.editOperationsByConversation[conversationId];
    if (!convEdits) return state;

    const updated = { ...convEdits };
    delete updated[messageId];

    return {
      editOperationsByConversation: {
        ...state.editOperationsByConversation,
        [conversationId]: updated,
      },
    };
  }),

  addDeletingMessage: (conversationId, messageId) => set((state) => {
    const setObj = new Set(state.deletingMessageIdsByConversation[conversationId] || []);
    setObj.add(messageId);

    return {
      deletingMessageIdsByConversation: {
        ...state.deletingMessageIdsByConversation,
        [conversationId]: setObj,
      },
    };
  }),

  removeDeletingMessage: (conversationId, messageId) => set((state) => {
    const setObj = new Set(state.deletingMessageIdsByConversation[conversationId] || []);
    setObj.delete(messageId);

    return {
      deletingMessageIdsByConversation: {
        ...state.deletingMessageIdsByConversation,
        [conversationId]: setObj,
      },
    };
  }),
}));