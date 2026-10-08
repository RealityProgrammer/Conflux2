import { createContext, useState, useContext, useRef, useEffect } from "react";

export type Guarded<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => ReturnType<T> | undefined;

type UnsavedChangesContextType = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  guard: <T extends (...args: any[]) => any>(action: T) => Guarded<T>;

  onBlocked: (listener: () => void) => () => void;

  hasPendingAction: boolean;
  confirmPending: () => void;
  cancelPending: () => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null);

export const UnsavedChangesProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDirty, setDirty] = useState(false);
  const [hasPendingAction, setHasPendingAction] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const listenersRef = useRef(new Set<() => void>());

  const onBlocked = (listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  };

  const guard = 
    <T extends (...args: any[]) => any>(action: T): Guarded<T> =>
      ((...args: Parameters<T>) => {
        if (isDirty) {
          pendingRef.current = () => action(...args);
          setHasPendingAction(true);

          listenersRef.current.forEach((fn) => fn());
          return undefined;
        }
        return action(...args);
      }) as Guarded<T>;
  
  const confirmPending = () => {
    const action = pendingRef.current;
    pendingRef.current = null;
    setHasPendingAction(false);
    action?.();
  };

  const cancelPending = () => {
    pendingRef.current = null;
    setHasPendingAction(false);
  };

  return (
    <UnsavedChangesContext.Provider value={{ 
      isDirty, 
      setDirty, 
      guard,
      onBlocked,
      hasPendingAction,
      confirmPending,
      cancelPending,
    }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const context = useContext(UnsavedChangesContext);
  if (!context) throw new Error("useUnsavedChanges must be used within an UnsavedChangesProvider.");
  
  return context;
};
