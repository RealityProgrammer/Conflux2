import { BsPersonCheck, BsPersonDash, BsPersonPlus, BsPersonX } from "react-icons/bs";
import IconButton from "./IconButton.tsx";
import type { HTMLAttributes } from "react";
import useSendFriendRequestMutation, {
  type UseSendFriendRequestMutationVariables,
} from "../hooks/useSendFriendRequestMutation.ts";
import { useMutationState } from "@tanstack/react-query";
import useFriendRequestActions, {
  type UseFriendRequestActionsVariables,
} from "../hooks/useFriendRequestActions.ts";
import type { SendFriendRequestResult } from "../api/types.ts";
import useUnfriendMutation, { type UseUnfriendMutationVariables } from "../hooks/useUnfriendMutation.ts";

interface SendButtonProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onError"> {
  recipientId: string;
  onSuccess?: (response: SendFriendRequestResult, recipientId: string) => void;
  onError?: (error: Error, recipientId: string) => void;
}

function Send({ recipientId, onSuccess, onError, ...props }: SendButtonProps) {
  const sendFriendRequestMutation = useSendFriendRequestMutation();
  const sendingFriendRequestToRecipientIds = useMutationState({
    filters: {
      mutationKey: useSendFriendRequestMutation.key,
      status: "pending",
    },
    select: (mutation) => (mutation.state.variables as UseSendFriendRequestMutationVariables).recipientId,
  });

  return (
    <IconButton
      theme="success"
      isLoading={sendingFriendRequestToRecipientIds.includes(recipientId)}
      onClick={() =>
        sendFriendRequestMutation.mutate(
          { recipientId },
          {
            onSuccess: onSuccess
              ? (data, variables) => {
                  onSuccess(data, variables.recipientId);
                }
              : undefined,
            onError: onError
              ? (error, variables) => {
                  onError(error, variables.recipientId);
                }
              : undefined,
          },
        )
      }
      {...props}
    >
      <BsPersonPlus className="size-6" />
    </IconButton>
  );
}

interface CancelButtonProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onError"> {
  requestId: string;
  onSuccess?: (variables: Omit<UseFriendRequestActionsVariables, "action">) => void;
  onError?: (error: Error, variables: UseFriendRequestActionsVariables) => void;
}

function Cancel({ requestId, onSuccess, onError, ...props }: CancelButtonProps) {
  const friendRequestActionsMutation = useFriendRequestActions();
  const friendRequestActions = useMutationState({
    filters: {
      mutationKey: useFriendRequestActions.key,
      status: "pending",
    },
    select: (mutation) => mutation.state.variables as UseFriendRequestActionsVariables,
  });

  const variables = friendRequestActions.find((v) => v.requestId === requestId);

  return (
    <IconButton
      theme="danger"
      isLoading={variables && variables.action === "cancel"}
      disabled={variables && variables.action !== "cancel"}
      onClick={() =>
        friendRequestActionsMutation.mutate(
          { requestId, action: "cancel" },
          {
            onSuccess: onSuccess
              ? (_data, variables: UseFriendRequestActionsVariables) => {
                  // just ensure the action
                  if (variables.action === "cancel") {
                    onSuccess({ requestId: variables.requestId });
                  }
                }
              : undefined,
            onError,
          },
        )
      }
      {...props}
    >
      <BsPersonDash className="size-6" />
    </IconButton>
  );
}

interface RejectButtonProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onError"> {
  requestId: string;
  onSuccess?: (variables: Omit<UseFriendRequestActionsVariables, "action">) => void;
  onError?: (error: Error, variables: UseFriendRequestActionsVariables) => void;
}

function Reject({ requestId, onSuccess, onError, ...props }: RejectButtonProps) {
  const friendRequestActionsMutation = useFriendRequestActions();
  const friendRequestActions = useMutationState({
    filters: {
      mutationKey: useFriendRequestActions.key,
      status: "pending",
    },
    select: (mutation) => mutation.state.variables as UseFriendRequestActionsVariables,
  });

  const variables = friendRequestActions.find((v) => v.requestId === requestId);

  return (
    <IconButton
      theme="danger"
      isLoading={variables && variables.action === "reject"}
      disabled={variables && variables.action !== "reject"}
      onClick={() =>
        friendRequestActionsMutation.mutate(
          { requestId, action: "reject" },
          {
            onSuccess: onSuccess
              ? (_data, variables: UseFriendRequestActionsVariables) => {
                  // just ensure the action
                  if (variables.action === "reject") {
                    onSuccess({ requestId: variables.requestId });
                  }
                }
              : undefined,
          },
        )
      }
      {...props}
    >
      <BsPersonX className="size-6" />
    </IconButton>
  );
}

interface AcceptButtonProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onError"> {
  requestId: string;
  onSuccess?: (variables: Omit<UseFriendRequestActionsVariables, "action">) => void;
  onError?: (error: Error, variables: UseFriendRequestActionsVariables) => void;
}

function Accept({ requestId, onSuccess, onError, ...props }: AcceptButtonProps) {
  const friendRequestActionsMutation = useFriendRequestActions();
  const friendRequestActions = useMutationState({
    filters: {
      mutationKey: useFriendRequestActions.key,
      status: "pending",
    },
    select: (mutation) => mutation.state.variables as UseFriendRequestActionsVariables,
  });

  const variables = friendRequestActions.find((v) => v.requestId === requestId);

  return (
    <IconButton
      theme="success"
      isLoading={variables && variables.action === "accept"}
      disabled={variables && variables.action !== "accept"}
      onClick={() =>
        friendRequestActionsMutation.mutate(
          { requestId, action: "accept" },
          {
            onSuccess: onSuccess
              ? (_data, variables: UseFriendRequestActionsVariables) => {
                  // just ensure the action
                  if (variables.action === "accept") {
                    onSuccess({ requestId: variables.requestId });
                  }
                }
              : undefined,
          },
        )
      }
      {...props}
    >
      <BsPersonCheck className="size-6" />
    </IconButton>
  );
}

interface UnfriendButtonProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onError"> {
  friendId: string;
  onSuccess?: (friendId: string) => void;
  onError?: (error: Error, friendId: string) => void;
}

function Unfriend({ friendId, onSuccess, onError, ...props }: UnfriendButtonProps) {
  const unfriendMutation = useUnfriendMutation();
  const unfriendingFriendIds = useMutationState({
    filters: {
      mutationKey: useSendFriendRequestMutation.key,
      status: "pending",
    },
    select: (mutation) => (mutation.state.variables as UseUnfriendMutationVariables).friendId,
  });

  return (
    <IconButton
      theme="danger"
      isLoading={unfriendingFriendIds.includes(friendId)}
      onClick={() =>
        unfriendMutation.mutate(
          { friendId },
          {
            onSuccess: onSuccess
              ? (_data, variables) => {
                  onSuccess(variables.friendId);
                }
              : undefined,
            onError: onError
              ? (error, variables) => {
                  onError(error, variables.friendId);
                }
              : undefined,
          },
        )
      }
      {...props}
    >
      <BsPersonDash className="size-6" />
    </IconButton>
  );
}

export const FriendActionButtons = {
  Send,
  Unfriend,
  Reject,
  Accept,
  Cancel,
};
