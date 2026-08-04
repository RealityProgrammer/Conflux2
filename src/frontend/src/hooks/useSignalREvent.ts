import {useEffect} from "react";
import {useSignalRConnection} from "../contexts/SignalRContext.tsx";

export default function useSignalREvent(methodName: string, callback: (...args: any[]) => void | any) {
    const { connection, isConnected } = useSignalRConnection();

    useEffect(() => {
        if (!connection || !isConnected) return;

        connection.on(methodName, callback);

        return () => connection.off(methodName, callback);
    }, [connection, isConnected]);
}