import {useEffect, useRef} from "react";
import {useSignalRConnection} from "../contexts/SignalRContext.tsx";

export default function useSignalREvent(methodNames: string[] | string, callback: (...args: any[]) => void | any) {
  const {connection, isConnected} = useSignalRConnection();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!connection || !isConnected) {
      console.log("useSignalREvent: no connection.");
      return;
    }

    const handler: (...args: any[]) => any = (...args: any[]) => callbackRef.current(...args);

    if (!Array.isArray(methodNames)) {
      connection.on(methodNames, handler);
      return () => connection.off(methodNames, handler);
    }

    for (let methodName of methodNames) {
      connection.on(methodName, handler);
    }

    return () => {
      for (let methodName of methodNames) {
        connection.off(methodName, handler);
      }
    }
  }, [connection, isConnected, methodNames]);
}
