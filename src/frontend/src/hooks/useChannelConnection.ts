import {useSignalRConnection} from "../contexts/SignalRContext.tsx";
import {useEffect} from "react";
import {HubConnectionState} from "@microsoft/signalr";

const joinOperationQueues = new Map<string, Queue<Promise<void>>>;

export default function useChannelConnection(channelId: string) {
  const signalrContext = useSignalRConnection();

  useEffect(() => {
    // blame strict mode for this fucked up code
    const connection = signalrContext.connection;

    if (!channelId || !signalrContext.isConnected || !connection) return;

    let isMounted = true;
    let hasJoined = false;

    if (!joinOperationQueues.has(channelId)) {
      joinOperationQueues.set(channelId, Promise.resolve());
    }

    let currentQueue = joinOperationQueues.get(channelId)!;

    currentQueue = currentQueue.then(async () => {
      if (!isMounted || connection.state !== HubConnectionState.Connected) return;

      await connection.invoke("JoinChannel", channelId);
      hasJoined = true;
      console.log(`Channel joined: ${channelId}`);
    }).catch(console.error);

    joinOperationQueues.set(channelId, currentQueue);

    return () => {
      isMounted = false;

      let cleanupQueue = joinOperationQueues.get(channelId)!;

      cleanupQueue = cleanupQueue.then(async () => {
        if (hasJoined && connection.state === HubConnectionState.Connected) {
          await connection.invoke("LeaveChannel", channelId);
          console.log(`Channel leaved: ${channelId}`);
        }
      }).catch(console.error);

      // Save the updated queue
      joinOperationQueues.set(channelId, cleanupQueue);
    };
  }, [channelId, signalrContext.isConnected, signalrContext.connection]);
}