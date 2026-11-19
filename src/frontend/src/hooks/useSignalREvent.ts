import { useEffect, useEffectEvent } from "react";
import { useSignalR } from "../contexts/SignalRContext.tsx";

export default function useSignalREvent(
  methodNames: string[] | string,
  callback: (...args: any[]) => void | any,
) {
  const { connection, isConnected } = useSignalR();
  const onSignalREvent = useEffectEvent(callback);

  const eventsKey = Array.isArray(methodNames) ? methodNames.join(",") : methodNames;

  useEffect(() => {
    if (!connection || !isConnected) {
      console.log("useSignalREvent: no connection.");
      return;
    }

    const handler: (...args: any[]) => any = (...args: any[]) => onSignalREvent(...args);
    const methods = Array.isArray(methodNames) ? methodNames : [methodNames];

    for (let methodName of methods) {
      connection.off(methodName, handler);
      connection.on(methodName, handler);
    }

    return () => {
      for (let methodName of methods) {
        connection.off(methodName, handler);
      }
    };
  }, [connection, isConnected, eventsKey]);
}
