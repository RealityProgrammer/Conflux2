import {useState} from "react";
import {authService} from "../../api/authService.ts";
import {HttpStatusCode} from "axios";

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
    <div className="h-dvh w-dvw bg-blue-400 flex flex-row justify-center items-center">
        <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-hidden relative p-10 max-w-xl">
          <h1 className="text-center font-bold text-3xl text-white">Hold up</h1>
          <p className="text-center text-gray-400 text-sm mt-2">
            <span>Seems like your account hasn't been verified yet.</span>
            <br/>
            <span>Click the button below to receive confirmation email.</span>
          </p>

          <button
            type="button"
            className="mt-8 text-white font-semibold rounded-lg w-full h-11 shadow-md bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 cursor-pointer"
            onClick={sendEmail}
            disabled={sendStatus === SendStatus.Sending}
          >
            Resend verification email
          </button>

          {
            sendStatus === SendStatus.Sending ?
              <p className="text-sm text-gray-400 animate-bounce text-center mt-2">Sending Email...</p> :
              sendStatus === SendStatus.Success ?
                <p className="text-sm text-green-500 text-center mt-2">Email has been sent.</p> :
                sendStatus === SendStatus.Failure ?
                  <p className="text-sm text-red-500 text-center mt-2">
                    Something went wrong while sending email. Please try again later.
                  </p> :
                  null
          }
        </div>
    </div>
  )
}