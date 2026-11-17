import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import Spinner from "../../components/Spinner.tsx";
import { authService } from "../../api/authService.ts";

enum VerificationStatus {
  Verifying = 0,
  Success = 1,
  Failed = 2,
}

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigation = useNavigate();

  const email: string | null = searchParams.get("email");
  const confirmationCode: string | null = searchParams.get("code");

  const [verificationStatus, setVerificationStatus] = useState(
    email == null || confirmationCode == null
      ? VerificationStatus.Failed
      : VerificationStatus.Verifying,
  );

  const hasExecuted = useRef<boolean>(false);

  useEffect(() => {
    if (hasExecuted.current) return;

    hasExecuted.current = true;

    if (!email || !confirmationCode) return;

    if (verificationStatus === VerificationStatus.Verifying) {
      const startVerify = async () => {
        await authService.confirmEmail(email, confirmationCode);

        setVerificationStatus(VerificationStatus.Success);

        const timeoutId = setTimeout(() => {
          navigation("/lobby/me");
        }, 3000);

        return () => clearTimeout(timeoutId);
      };

      startVerify();
    }
  }, [confirmationCode, verificationStatus, navigation, email]);

  return (
    <div className="grid h-dvh w-dvw grid-cols-1 bg-gray-800 px-4 md:grid-cols-4 md:px-0 lg:grid-cols-3">
      <div className="col-span-1 col-start-1 md:col-span-2 md:col-start-2 lg:col-span-1 lg:col-start-2">
        <div className="flex size-full flex-col items-center justify-center">
          <div className="relative w-full overflow-hidden rounded-3xl bg-gray-700 text-white shadow-xl">
            <div className="panel-accent-color-1 absolute h-1 w-full rounded-t-3xl"></div>

            <div className="flex flex-col items-center justify-center p-10">
              {verificationStatus === VerificationStatus.Verifying ? (
                <>
                  <Spinner className="size-16 fill-white" />
                  <p className="mt-2 text-center text-sm text-gray-400">
                    Verifying...
                  </p>
                </>
              ) : verificationStatus === VerificationStatus.Success ? (
                <>
                  <h1 className="text-center text-3xl font-bold text-white">
                    Verification Success
                  </h1>
                  <p className="mt-2 text-center text-sm text-gray-400">
                    Welcome aboard, you will be redirected soon
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-center text-3xl font-bold text-white">
                    Verification Failed
                  </h1>
                  <p className="mt-2 text-center text-sm text-gray-400">
                    Something might have gone wrong...
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
