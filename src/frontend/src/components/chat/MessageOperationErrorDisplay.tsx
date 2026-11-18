import { Popover, Tooltip } from "radix-ui";
import type { MessageOperationError } from "../../store/useMessageOperationsStore.ts";
import type { SVGAttributes } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

interface MessageOperationErrorDisplayProps extends SVGAttributes<SVGElement> {
  error: MessageOperationError;
}

export default function MessageOperationErrorDisplay({
  error,
  ...props
}: MessageOperationErrorDisplayProps) {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <FaExclamationTriangle {...props} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={4}
          className="bg-gray-750 rounded-md border-2 border-gray-600 p-2 text-sm text-white shadow-md"
        >
          {(() => {
            switch (error.type) {
              case "network":
                return "Network issue happened.";

              case "forbidden":
                return error.message;

              case "server":
                return "Internal server error happened.";

              case "validation":
                const messages = error.messages;

                return messages.length === 1 ? (
                  <p>{messages[0]}</p>
                ) : (
                  <ol className="list-inside list-decimal space-y-2">
                    {messages.map((errorMessage) => (
                      <li>{errorMessage}</li>
                    ))}
                  </ol>
                );

              default:
                return "Unknown error happened.";
            }
          })()}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
