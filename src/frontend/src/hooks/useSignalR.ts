import {useEffect, useRef, useState} from "react";
import {HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel} from "@microsoft/signalr";

export type SignalRListener = (...args: any[]) => any;

export function useSignalR(url: string, listeners: Record<string, SignalRListener>): HubConnection | null {
    const [connection, setConnection] = useState<HubConnection | null>(null);

    const listenersRef = useRef(listeners);

    // update the ref on every render
    useEffect(() => {
        listenersRef.current = listeners;
    });

    // build the connection
    useEffect(() => {
        if (connection) return;

        // have to do this so that react strict mode double invocation doesn't cause error in the console
        let isMounted = true;

        const newConnection = new HubConnectionBuilder()
            .withUrl(url, {
                withCredentials: true,
                skipNegotiation: true,
                transport: HttpTransportType.WebSockets,
            })
            .configureLogging(LogLevel.Debug)
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);

        Object.keys(listenersRef.current).forEach((eventName) => {
            newConnection.on(eventName, (...args) => {
                listenersRef.current[eventName]?.(...args);
            });
        });

        const startConnection = async () => {
            try {
                if (newConnection.state === HubConnectionState.Disconnected) {
                    await newConnection.start();
                }

                if (!isMounted) {
                    await newConnection.stop();
                    return;
                }
            } catch (error) {
                console.error("Failed to connect to SignalR: ", error);
            }
        };

        startConnection();

        return () => {
            if (newConnection.state === HubConnectionState.Connected) {
                newConnection.stop();
            }
        };
    }, [url]);

    return connection;
}