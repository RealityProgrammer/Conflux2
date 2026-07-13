import { useState } from "react";

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
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSendStatus(SendStatus.Success);
    }

    return (
        <div className="h-dvh w-dvw bg-blue-400 grid grid-cols-1 px-4 md:px-0 md:grid-cols-4 lg:grid-cols-3">
            <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2 lg:col-start-2 lg:col-span-1">
                <div className="size-full flex flex-col justify-center items-center">
                    <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-hidden relative">
                        <div className="absolute rounded-t-3xl w-full h-1 panel-accent-color-1"></div>

                        <div className="p-10">
                            <h1 className="text-center font-bold text-3xl text-white">Almost there</h1>
                            <p className="text-center text-gray-400 text-sm mt-2">Finish the next step to become one of us</p>

                            { /* TODO: Disable button when is sending, success or failure. */}
                            <button
                                type="button"
                                className={`mt-8 text-white font-semibold rounded-lg w-full h-11 shadow-md bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 cursor-pointer`}
                                onClick={sendEmail}
                            >
                                Send verification email
                            </button>

                            {
                                sendStatus === SendStatus.Sending ?
                                    <p className="text-sm text-gray-400 animate-bounce text-center mt-2">Sending Email...</p> :
                                    sendStatus === SendStatus.Success ?
                                        <p className="text-sm text-green-500 text-center mt-2">Email has been sent.</p> :
                                        sendStatus === SendStatus.Failure ?
                                            <p className="text-sm text-red-500 text-center mt-2">Something went wrong while sending email. Please try again later.</p> :
                                            null
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}