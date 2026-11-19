import type { MessageOperationError } from "../../store/useMessageOperationsStore";

interface MessageOperationErrorTextProps {
  error?: MessageOperationError | null;
}

export default function MessageOperationErrorText({
  error
}: MessageOperationErrorTextProps) {
  if (!error) return null;

  switch (error.type) {
    case "network":
      return (
        <p className="text-xs font-bold text-red-500 mt-1">
          A network error occurred.
        </p>
      );

    case "forbidden":
      return (
        <p className="text-xs font-bold text-red-500 mt-1">
          You are not allowed to send message in this conversation.
        </p>
      );

    case "server":
      return (
        <p className="text-xs font-bold text-red-500 mt-1">
          An internal server error occurred.
        </p>
      );

    case "validation":
      return (
        <p className="text-xs font-bold text-red-500 mt-1">
          {error.messages[0]}
        </p>
      );

    default:
      return (
        <p className="mt-1 text-xs font-bold text-red-500">
          Unknown error occurred.
        </p>
      );
  }
}
