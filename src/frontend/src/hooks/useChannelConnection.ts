import {useSignalRConnection} from "../contexts/SignalRContext.tsx";
import {useEffect, useRef} from "react";
import {HubConnectionState} from "@microsoft/signalr";

export default function useChannelConnection(channelId: string | undefined) {
  const { connection, isConnected } = useSignalRConnection();

  const operationPromiseRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!channelId || !isConnected || !connection) {
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
        await connection.invoke("JoinChannel", channelId);

        // race-condition preventing
        if (!isMounted) {
          if (connection.state === HubConnectionState.Connected) {
            connection
              .invoke("LeaveChannel", channelId)
              .catch(err => console.error(`Failed to leave channel ${channelId}:`, err));
          }

          return;
        }

        hasJoined = true;
        console.log("Joined channel", channelId);
      } catch (err) {
        console.error(`Failed to join channel ${channelId}:`, err);
      } finally {
        resolveOperation!();
      }
    })();

    return () => {
      isMounted = false;

      if (hasJoined && connection.state === HubConnectionState.Connected) {
        const leavePromise = connection.invoke("LeaveChannel", channelId)
          .then(() => console.log(`Left channel: ${channelId}`))
          .catch(err => console.error(`Failed to leave channel ${channelId}:`, err));

        operationPromiseRef.current = operationPromiseRef.current.then(
          () => leavePromise
        );
      }
    };
  }, [channelId, isConnected, connection]);
}