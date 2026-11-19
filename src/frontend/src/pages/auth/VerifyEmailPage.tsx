import { useState } from "react";
import { authService } from "../../api/authService.ts";
import { HttpStatusCode } from "axios";

enum SendStatus {
  NotSend = 0,
  Sending = 1,
  Success = 2,
  Failure = 3,
}

export default function VerifyEmailPage() {
  const [sendStatus, setSendStatus] = useState<SendStatus>(SendStatus.NotSend);

  const sendEmail = async () => {
    if (sendStatus !== SendStatus.NotSend) {
      return;
    }

    setSendStatus(SendStatus.Sending);
    const response = await authService.resendConfirmEmail();
    setSendStatus(response.statusCode === HttpStatusCode.Ok ? SendStatus.Success : SendStatus.Failure);
  };

  return (
    <div className="flex h-dvh w-dvw flex-row items-center justify-center bg-blue-400">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-gray-700 p-10 text-white shadow-xl">
        <h1 className="text-center text-3xl font-bold text-white">Hold up</h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          <span>Seems like your account hasn't been verified yet.</span>
          <br />
          <span>Click the button below to receive confirmation email.</span>
        </p>

        <button
          type="button"
          className="mt-8 h-11 w-full cursor-pointer rounded-lg bg-linear-to-r from-indigo-500 to-purple-500 font-semibold text-white shadow-md hover:from-indigo-600 hover:to-purple-600"
          onClick={sendEmail}
          disabled={sendStatus === SendStatus.Sending}
        >
          Resend verification email
        </button>

        {sendStatus === SendStatus.Sending ? (
          <p className="mt-2 animate-bounce text-center text-sm text-gray-400">Sending Email...</p>
        ) : sendStatus === SendStatus.Success ? (
          <p className="mt-2 text-center text-sm text-green-500">Email has been sent.</p>
        ) : sendStatus === SendStatus.Failure ? (
          <p className="mt-2 text-center text-sm text-red-500">
            Something went wrong while sending email. Please try again later.
          </p>
        ) : null}
      </div>
    </div>
  );
}
