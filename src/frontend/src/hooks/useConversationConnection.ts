import {useSignalR} from "../contexts/SignalRContext.tsx";
import {useEffect, useRef} from "react";
import {HubConnectionState} from "@microsoft/signalr";

export default function useConversationConnection(conversationId: string | undefined) {
  const { connection, isConnected, invokeSafely } = useSignalR();

  const operationPromiseRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!conversationId || !isConnected || !connection) {
      return;
    }

    let isMounted = true;
    let hasJoined = false;

    (async () => {
      // wait for previous cleanup (blame StrictMode)
      const previousOperation = operationPromiseRef.current;

      let resolveOperation: () => void;
      operationPromiseRef.current = new Promise<void>((resolve) => {
        resolveOperation = resolve;
      });

      await previousOperation;

      if (connection.state !== HubConnectionState.Connected) {
        resolveOperation!();
        return;
      }

      try {
        await invokeSafely("JoinConversation", conversationId);

        // race-condition preventing
        if (!isMounted) {
          if (connection.state === HubConnectionState.Connected) {
            invokeSafely("LeaveConversation", conversationId)
              .catch(err => console.error(`Failed to leave conversation ${conversationId}:`, err));
          }

          return;
        }

        hasJoined = true;
        console.log("Joined conversation", conversationId);
      } catch (err) {
        console.error(`Failed to join conversation ${conversationId}:`, err);
      } finally {
        resolveOperation!();
      }
    })();

    return () => {
      isMounted = false;

      if (hasJoined && connection.state === HubConnectionState.Connected) {
        const leavePromise = invokeSafely("LeaveConversation", conversationId)
          .then(() => console.log(`Left conversation: ${conversationId}`))
          .catch(err => console.error(`Failed to leave conversation ${conversationId}:`, err));

        operationPromiseRef.current = operationPromiseRef.current.then(
          () => leavePromise
        );
      }
    };
  }, [conversationId, isConnected, connection]);
}