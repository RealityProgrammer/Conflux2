import {useSignalRConnection} from "../contexts/SignalRContext.tsx";
import {useEffect} from "react";
import {HubConnectionState} from "@microsoft/signalr";

const joinOperationQueues = new Map<string, Queue<Promise<void>>>;

export default function useServerConnection(serverId: string) {
  const signalrContext = useSignalRConnection();

  useEffect(() => {
    // blame strict mode for this fucked up code
    const connection = signalrContext.connection;

    if (!serverId || !signalrContext.isConnected || !connection) return;

    let isMounted = true;
    let hasJoined = false;

    if (!joinOperationQueues.has(serverId)) {
      joinOperationQueues.set(serverId, Promise.resolve());
    }

    let currentQueue = joinOperationQueues.get(serverId)!;

    currentQueue = currentQueue.then(async () => {
      if (!isMounted || connection.state !== HubConnectionState.Connected) return;

      await connection.invoke("JoinServer", serverId);
      hasJoined = true;
      console.log(`Server joined: ${serverId}`);
    }).catch(console.error);

    joinOperationQueues.set(serverId, currentQueue);

    return () => {
      isMounted = false;

      let cleanupQueue = joinOperationQueues.get(serverId)!;

      cleanupQueue = cleanupQueue.then(async () => {
        if (hasJoined && connection.state === HubConnectionState.Connected) {
          await connection.invoke("LeaveServer", serverId);
          console.log(`Server leaved: ${serverId}`);
        }
      }).catch(console.error);

      // Save the updated queue
      joinOperationQueues.set(serverId, cleanupQueue);
    };
  }, [serverId, signalrContext.isConnected, signalrContext.connection]);
}