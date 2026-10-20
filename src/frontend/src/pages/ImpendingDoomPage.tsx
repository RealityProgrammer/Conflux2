import {random} from "animejs";
import {FaFireFlameCurved} from "react-icons/fa6";
import {BsExclamationTriangle, BsPersonXFill} from "react-icons/bs";
import {type CSSProperties, useEffect, useState} from "react";
import {useAuth} from "../contexts/AuthContext.tsx";
import {useMutation, useQuery} from "@tanstack/react-query";
import {sessionUserService} from "../api/sessionUserService.ts";
import type {AccountDeletionStatus, ServiceResponse} from "../api/types.ts";
import Spinner from "../components/Spinner.tsx";
import {useRestoreAccountMutation} from "../hooks/useRestoreAccountMutation.ts";
import {toast} from "react-toastify";

const GRACE_PERIOD_DAYS = 14;

export default function ImpendingDoomPage() {
  return (
    <div className="w-dvw h-dvh bg-zinc-900 flex flex-row justify-center items-center">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[120vw] h-[60vh] bg-linear-to-t from-red-600/30 via-orange-600/15 to-transparent blur-3xl animate-[animate-fireFlicker_8s_infinite_ease-in-out]" />
        <div className="absolute bottom-0 inset-x-0 h-48 bg-linear-to-t from-red-950/60 to-transparent" />

        {[...Array(random(35, 50))].map((_, i) => {
          const size = Math.random() * 4 + 2;
          const left = Math.random() * 100;
          const duration = Math.random() * 3 + 2;
          const delay = Math.random() * 5;
          const drift = `${(Math.random() - 0.5) * 150}px`;

          return (
            <div
              key={i}
              className="absolute -bottom-3 rounded-full bg-orange-400 shadow-[0_0_8px_#f97316]"
              style={{
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                animation: `animate-emberRise ${duration}s infinite ease-out`,
                animationDelay: `${delay}s`,
                '--drift': drift,
              } as CSSProperties}
            />
          );
        })}
      </div>
      
      <ContentPanel/>
    </div>
  );
}

function ContentPanel() {
  const { data, isLoading, isError } = useQuery<unknown, Error, AccountDeletionStatus>({
    queryKey: ["GetAccountDeletionStatus"],
    queryFn: async (): Promise<AccountDeletionStatus> => {
      const response: ServiceResponse<AccountDeletionStatus> = await sessionUserService.getAccountDeletionStatus();

      if (!response.success) {
        throw new Error(response.error!.message!);
      }

      return response.data!;
    },
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  return (
    <div className="relative w-xl bg-gray-700 rounded-lg text-white">
      {isLoading ? (
        <div className="p-4 flex justify-center items-center">
          <Spinner className="size-10 fill-white"/>
        </div>
      ) : isError || !data ? (
        <div className="p-4 flex flex-col gap-2 justify-center items-center">
          <BsExclamationTriangle className="size-10 fill-white"/>

          <p>Failed to load account deletion status...</p>
        </div>
      ) : (
        <SuccessfullyLoaded data={data}/>
      )}
    </div>
  )
}

function SuccessfullyLoaded({data}: {data: AccountDeletionStatus}) {
  const { logout, invalidateSession } = useAuth();
  const { mutate, isPending } = useRestoreAccountMutation({
    onSuccess: (data: ServiceResponse) => {
      if (data.success) {
        invalidateSession();
      } else {
        toast.error("Failed to restore account. Please try again later.");
      }
    },
    onError: (_error) => {
      toast.error("Failed to restore account. Please try again later.");
    },
  });

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const targetTime = new Date(data.deleteAt).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    updateCountdown(); // Run immediately on mount
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [data.deleteAt, data.scheduledAt]);

  const scheduledTime = new Date(data.scheduledAt).getTime();
  const elapsedMs = Date.now() - scheduledTime;
  const rawElapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.min(GRACE_PERIOD_DAYS, Math.max(0, rawElapsedDays));
  
  return (
    <>
      <header className="px-3 py-2 border-b border-b-gray-600 flex flex-row gap-2 items-center">
        <BsPersonXFill className="size-10 fill-white flex-none"/>

        <div className="flex-1">
          <h1 className="font-bold text-xl text-white">
            Account Scheduled for Deletion
          </h1>

          <p className="text-sm text-gray-400">
            Revive or watch it wither away. Your choice.
          </p>
        </div>
      </header>

      <main className="px-4 py-2">
        <p className="mb-2">
          <span>Approximate remaining time:</span>
          <span className="float-end">
            {timeLeft.days} days, {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </span>
        </p>

        <div className="grid grid-cols-14 gap-1">
          {Array.from({ length: GRACE_PERIOD_DAYS }, (_, idx) => {
            const dayNumber = idx + 1;
            const isElapsed = dayNumber <= elapsedDays;
            const isCurrentDay = dayNumber === elapsedDays + 1;

            return (
              <div key={dayNumber} className="relative group flex flex-col items-center">
                {/* Day Box */}
                <div
                  className={`w-full aspect-4/5 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all duration-300 relative overflow-hidden
                        ${isElapsed
                    ? 'bg-red-950/40 border-2 border-red-800/40 text-red-400/70'
                    : isCurrentDay
                      ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-200 animate-pulse'
                      : 'bg-gray-800/40 border-2 border-gray-600 text-zinc-400'
                  }
                      `}
                >
                  {isElapsed ? (
                    <FaFireFlameCurved className="w-3.5 h-3.5 text-red-500/60" />
                  ) : (
                    <span>{dayNumber}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-t-gray-600 flex flex-row justify-end gap-3 p-4">
        <button 
          className="button-theme-danger px-3 py-2 rounded-md cursor-pointer"
          disabled={isPending}
          onClick={logout}
        >
          Logout
        </button>

        <button 
          className="button-theme-primary px-3 py-2 rounded-md cursor-pointer"
          disabled={isPending}
          onClick={() => mutate()}
        >
          Restore Account
        </button>
      </footer>
    </>
  )
}