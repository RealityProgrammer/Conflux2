import {useSignalRConnection} from "../contexts/SignalRContext.tsx";
import {useEffect, useRef} from "react";
import {HubConnectionState} from "@microsoft/signalr";

export default function useServerConnection(serverId: string | undefined) {
  const { connection, isConnected } = useSignalRConnection();

  const operationPromiseRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!serverId || !isConnected || !connection) {
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
        await connection.invoke("JoinServer", serverId);

        // race-condition preventing
        if (!isMounted) {
          if (connection.state === HubConnectionState.Connected) {
            await connection
              .invoke("LeaveServer", serverId)
              .catch(err => console.error(`Failed to leave server ${serverId}:`, err));
          }
          return;
        }

        hasJoined = true;
        console.log("Joined server", serverId);
      } catch (err) {
        console.error(`Failed to join server ${serverId}:`, err);
      } finally {
        resolveOperation!();
      }
    })();

    return () => {
      isMounted = false;

      if (hasJoined && connection.state === HubConnectionState.Connected) {
        const leavePromise = connection.invoke("LeaveServer", serverId)
          .then(() => console.log(`Left server: ${serverId}`))
          .catch(err => console.error(`Failed to leave server ${serverId}:`, err));

        operationPromiseRef.current = operationPromiseRef.current.then(
          () => leavePromise
        );
      }
    }
  }, [serverId, isConnected, connection]);
}