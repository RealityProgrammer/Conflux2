import {useSignalRConnection} from "../contexts/SignalRContext.tsx";
import {useEffect} from "react";
import {HubConnectionState} from "@microsoft/signalr";

const operationsMap = new Map<string, Promise<void>>;

export default function useChannelConnection(channelId: string | undefined) {
  const signalrContext = useSignalRConnection();

  useEffect(() => {
    // blame strict mode for this fucked up code
    const connection = signalrContext.connection;

    if (!channelId || !signalrContext.isConnected || !connection) return;

    let isMounted = true;
    let hasJoined = false;

    if (!operationsMap.has(channelId)) {
      operationsMap.set(channelId, Promise.resolve());
    }

    let currentQueue = operationsMap.get(channelId)!;

    currentQueue = currentQueue.then(async () => {
      if (!isMounted || connection.state !== HubConnectionState.Connected) return;

      await connection.invoke("JoinChannel", channelId);
      hasJoined = true;
      console.log(`Channel joined: ${channelId}`);
    }).catch(console.error);

    operationsMap.set(channelId, currentQueue);

    return () => {
      isMounted = false;

      let cleanupQueue = operationsMap.get(channelId)!;

      cleanupQueue = cleanupQueue.then(async () => {
        if (hasJoined && connection.state === HubConnectionState.Connected) {
          await connection.invoke("LeaveChannel", channelId);
          console.log(`Channel leaved: ${channelId}`);
        }
      }).catch(console.error);

      // Save the updated queue
      operationsMap.set(channelId, cleanupQueue);
    };
  }, [channelId, signalrContext.isConnected, signalrContext.connection]);
}