import {useEffect, useRef} from "react";
import {useSignalRConnection} from "../contexts/SignalRContext.tsx";

export default function useSignalREvent(methodName: string, callback: (...args: any[]) => void | any) {
    const { connection, isConnected } = useSignalRConnection();
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        if (!connection || !isConnected) return;

        const handler = (...args: any[]) => callbackRef.current(...args);

        connection.on(methodName, handler);

        return () => connection.off(methodName, handler);
    }, [connection, isConnected, methodName]);
}
