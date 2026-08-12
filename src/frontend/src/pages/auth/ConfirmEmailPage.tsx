import {useNavigate, useSearchParams} from "react-router";
import {useEffect, useRef, useState} from "react";
import Spinner from "../../components/Spinner.tsx";
import {authService} from "../../api/authService.ts";

enum VerificationStatus {
  Verifying = 0,
  Success = 1,
  Failed = 2,
}

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigation = useNavigate();

  const userId: string | null = searchParams.get("userId");
  const base64EncodedCode: string | null = searchParams.get("code");

  const [verificationStatus, setVerificationStatus] = useState(
    userId == null || base64EncodedCode == null ? VerificationStatus.Failed : VerificationStatus.Verifying
  );

  const hasExecuted = useRef<boolean>(false);

  useEffect(() => {
    if (hasExecuted.current) return;

    hasExecuted.current = true;

    if (verificationStatus === VerificationStatus.Verifying) {
      const startVerify = async () => {
        await authService.confirmEmail({
          userId: userId!,
          confirmationCode: atob(base64EncodedCode!),
        });

        setVerificationStatus(VerificationStatus.Success);

        const timeoutId = setTimeout(() => {
          navigation("/lobby");
        }, 3000);

        return () => clearTimeout(timeoutId);
      };

      startVerify();
    }
  }, []);

  return (
    <div className="h-dvh w-dvw bg-gray-800 grid grid-cols-1 px-4 md:px-0 md:grid-cols-4 lg:grid-cols-3">
      <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2 lg:col-start-2 lg:col-span-1">
        <div className="size-full flex flex-col justify-center items-center">
          <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-hidden relative">
            <div className="absolute rounded-t-3xl w-full h-1 panel-accent-color-1"></div>

            <div className="p-10 flex flex-col justify-center items-center">
              {
                verificationStatus === VerificationStatus.Verifying ?
                  <>
                    <Spinner className="size-16 fill-white"/>
                    <p className="text-center text-gray-400 text-sm mt-2">
                      Verifying...
                    </p>
                  </>
                  : verificationStatus === VerificationStatus.Success ?
                    <>
                      <h1 className="text-center font-bold text-3xl text-white">
                        Verification Success
                      </h1>
                      <p className="text-center text-gray-400 text-sm mt-2">
                        Welcome aboard, you will be redirected soon
                      </p>
                    </>
                    :
                    <>
                      <h1 className="text-center font-bold text-3xl text-white">
                        Verification Failed
                      </h1>
                      <p className="text-center text-gray-400 text-sm mt-2">
                        Something might have gone wrong...
                      </p>
                    </>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}