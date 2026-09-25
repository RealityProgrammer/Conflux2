import {PresenceStatus} from "../graphql/types.ts";
import {createContext, type ReactNode, useContext} from "react";
import {
  type GetSessionUserManualPresenceStatusQuery,
  useGetSessionUserManualPresenceStatusQuery, useUpdateManualPresenceStatusMutation
} from "../graphql/queries.ts";
import {useAuth} from "./AuthContext.tsx";
import {toast} from "react-toastify";
import useIdleTimer from "../hooks/useIdleTimer.tsx";
import {useQueryClient} from "@tanstack/react-query";

interface PresenceContextType {
  manualStatus: PresenceStatus; // TODO: intersect with a type containing Error value?
  effectiveStatus: PresenceStatus;
  // updateManualStatus: (newStatus: PresenceStatus) => Promise<void>;
  updateManualStatus: (newStatus: PresenceStatus, side: "client" | "server") => void;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export default function PresenceProvider({children} : {children: ReactNode}) {
  const { userProfile } = useAuth()!;
  const queryClient = useQueryClient();

  const isIdle = useIdleTimer();

  const { data, isLoading, isError } = useGetSessionUserManualPresenceStatusQuery(
    {},
    { enabled: !!userProfile?.id }
  );

  const updateManualPresenceMutation = useUpdateManualPresenceStatusMutation({
    onMutate: async () => {
      // optimistic update
    },
    onError: (_error: Error) => {
      toast.error("Failed to update presence status.");
    },
  });

  const manualStatus = data?.sessionUser?.manualPresenceStatus ?? PresenceStatus.Offline;

  const getEffectiveStatus = (): PresenceStatus => {
    if (isLoading || isError) return PresenceStatus.Offline;

    if (manualStatus === PresenceStatus.Invisible) return PresenceStatus.Offline;
    if (manualStatus === PresenceStatus.DoNotDisturb) return PresenceStatus.DoNotDisturb;
    if (isIdle) return PresenceStatus.Idle;

    return manualStatus;
  };

  const updateManualStatus = async (newStatus: PresenceStatus, side: "client" | "server") => {
    if (!data?.sessionUser?.manualPresenceStatus) return;

    if (side === "server") {
      updateManualPresenceMutation.mutate({ value: newStatus });
    }

    queryClient.setQueryData<GetSessionUserManualPresenceStatusQuery>(
      useGetSessionUserManualPresenceStatusQuery.getKey({}),
      (oldData: NoInfer<GetSessionUserManualPresenceStatusQuery> | undefined): NoInfer<GetSessionUserManualPresenceStatusQuery> | undefined => {
        if (!oldData || !oldData.sessionUser) return oldData;

        return {
          ...oldData,
          sessionUser: {
            ...oldData.sessionUser,
            manualPresenceStatus: newStatus,
          },
        };
      }
    );
  };

  return (
    <PresenceContext.Provider
      value={{
        manualStatus: data?.sessionUser?.manualPresenceStatus ?? PresenceStatus.Offline,
        effectiveStatus: getEffectiveStatus(),
        updateManualStatus,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextType {
  const context = useContext(PresenceContext);
  if (!context) throw new Error('usePresence must be used within a PresenceProvider');

  return context;
}