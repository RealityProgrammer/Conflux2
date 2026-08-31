import {useSignalRConnection} from "../contexts/SignalRContext.tsx";
import {useEffect} from "react";
import {HubConnectionState} from "@microsoft/signalr";

export default function useServerConnection(serverId: string | undefined) {
  const { connection, isConnected } = useSignalRConnection();

  useEffect(() => {
    if (!serverId || !isConnected || !connection) {
      return;
    }

    let isMounted = true;
    let hasJoined = false;

    (async () => {
      if (connection.state !== HubConnectionState.Connected) return;

      try {
        await connection.invoke("JoinServer", serverId);

        // race-condition preventing
        if (!isMounted) {
          if (connection.state === HubConnectionState.Connected) {
            await connection.invoke("LeaveServer", serverId);
          }
          return;
        }

        hasJoined = true;
        console.log("Joined server", serverId);
      } catch (err) {
        console.error(`Failed to join server ${serverId}:`, err);
      }
    })();

    return () => {
      isMounted = false;

      if (hasJoined && connection.state === HubConnectionState.Connected) {
        connection.invoke("LeaveServer", serverId)
          .then(() => console.log(`Left server: ${serverId}`))
          .catch(err => console.error(`Failed to leave server ${serverId}:`, err));
      }
    }
  }, [serverId, isConnected, connection]);
}