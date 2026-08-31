import {useSignalRConnection} from "../contexts/SignalRContext.tsx";
import {useEffect} from "react";
import {HubConnectionState} from "@microsoft/signalr";

export default function useChannelConnection(channelId: string | undefined) {
  const { connection, isConnected } = useSignalRConnection();

  useEffect(() => {
    if (!channelId || !isConnected || !connection) {
      return;
    }

    let isMounted = true;
    let hasJoined = false;

    (async () => {
      if (connection.state !== HubConnectionState.Connected) return;

      try {
        await connection.invoke("JoinChannel", channelId);

        // race-condition preventing
        if (!isMounted) {
          if (connection.state === HubConnectionState.Connected) {
            await connection.invoke("LeaveChannel", channelId);
          }
          return;
        }

        hasJoined = true;
        console.log("Joined channel", channelId);
      } catch (err) {
        console.error(`Failed to join channel ${channelId}:`, err);
      }
    })();

    return () => {
      isMounted = false;

      if (hasJoined && connection.state === HubConnectionState.Connected) {
        connection.invoke("LeaveChannel", channelId)
          .then(() => console.log(`Left channel: ${channelId}`))
          .catch(err => console.error(`Failed to leave channel ${channelId}:`, err));
      }
    };
  }, [channelId, isConnected, connection]);
}