import { TimelineItem } from "./TimelineItem.ts";
import type { TimelineContext } from "./TimelineContext.ts";
import { type ReactNode } from "react";
import MessageBody from "./MessageBody.tsx";
import IconButton from "../IconButton.tsx";
import { FaRepeat, FaTrashCan } from "react-icons/fa6";
import type {
  MessageOperationError,
  MessageSendInput,
} from "../../store/useMessageOperationsStore.ts";
import MessageOperationErrorDisplay from "./MessageOperationErrorDisplay.tsx";
import ErrorText from "../ErrorText.tsx";

type SendingMessageProps = {
  idempotencyKey: string;
  input: MessageSendInput;
  error?: MessageOperationError;
};

export class SendingMessage extends TimelineItem<SendingMessageProps> {
  constructor(data: SendingMessageProps) {
    super(data);
  }

  getKey(): string {
    return `sending-msg_${this.data.idempotencyKey}`;
  }

  render(context: TimelineContext): ReactNode {
    const trimmedBody = this.data.input.body?.trim() ?? null;

    return (
      <div className="hover-highlight">
        <div
          className={`group relative px-2 py-1 ${this.data.error ? "bg-red-500/20" : ""}`}
        >
          <div
            className={`ml-13 flex-1 ${this.data.error ? "text-gray-300" : "text-gray-400"}`}
          >
            {trimmedBody && trimmedBody.length > 0 ? (
              <>
                <MessageBody content={this.data.input.body} />

                {this.data.input.attachments &&
                  this.data.input.attachments.length > 0 && (
                    <p className="text-xs">
                      With {this.data.input.attachments.length} attachment(s).
                    </p>
                  )}
              </>
            ) : (
              <p className="text-xs">
                {this.data.input.attachments.length} attachment(s).
              </p>
            )}

            {(() => {
              const error = this.data.error;

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
            })()}
          </div>

          {this.data.error && (
            <section className="absolute top-0 right-2 hidden -translate-y-1/2 flex-row items-center gap-2 rounded-md border-2 border-gray-500 bg-gray-600 px-2 py-1 shadow-md group-hover:flex">
              <IconButton
                theme="default"
                className="flex-1"
                onClick={() =>
                  context.actions.retrySendingOperation(
                    this.data.idempotencyKey,
                  )
                }
              >
                <FaRepeat className="size-5" />
              </IconButton>

              <IconButton
                theme="danger"
                className="flex-1"
                onClick={() =>
                  context.actions.removeSendingOperation(
                    this.data.idempotencyKey,
                  )
                }
              >
                <FaTrashCan className="size-5" />
              </IconButton>
            </section>
          )}
        </div>
      </div>
    );
  }
}
