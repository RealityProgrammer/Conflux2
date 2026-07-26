import {useEffect} from "react";

export function emitGlobalEvent<T = any>(eventName: string, payload: T) {
    window.dispatchEvent(new CustomEvent(eventName, {
        detail: payload,
        cancelable: false,
        bubbles: true,
    }));
}

export function useGlobalEvent<T = any>(eventName: string, callback: (payload: T) => void) {
    useEffect(() => {
        const handleEvent = (event: Event) => {
            callback((event as CustomEvent<T>).detail);
        };

        window.addEventListener(eventName, handleEvent);
        return () => window.removeEventListener(eventName, handleEvent);
    }, [eventName, callback]);
}