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
import MessageOperationErrorText from "./MessageOperationErrorText.tsx";
import { MessageRow } from "./MessageRow.tsx";
import { useAuth } from "../../contexts/AuthContext.tsx";

type SendingMessageProps = {
  showHeader: boolean;
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
    return (
      <MessageView
        input={this.data.input}
        showHeader={this.data.showHeader}
        error={this.data.error}
        retrySendOperation={() => {
          context.actions.retrySendingOperation(this.data.idempotencyKey);
        }}
        removeSendOperation={() => {
          context.actions.removeSendingOperation(this.data.idempotencyKey);
        }}
      />
    );
  }
}

interface MessageViewProps {
  input: MessageSendInput;
  showHeader: boolean;
  error?: MessageOperationError | null;
  retrySendOperation: () => void;
  removeSendOperation: () => void;
}

function MessageView({
  input,
  showHeader,
  error,
  retrySendOperation,
  removeSendOperation,
}: MessageViewProps) {
  const auth = useAuth();

  return (
    <div className="group block w-full hover-highlight">
      <div className={`px-2 py-0.75 relative ${error ? "bg-red-500/20" : ""}`}>
        <MessageRow.Row header={showHeader && auth.userProfile ? {
          senderId: auth.userProfile.id,
          senderAvatarVersion: auth.userProfile.avatarVersion,
          avatarAlt: "Your avatar",
          senderDisplayName: auth.userProfile.displayName ?? "???",
        } : undefined}>
          <div className="space-y-1 text-gray-400">
            <MessageBody content={input.body} />

            {input.attachments && input.attachments.length > 0 && (
              <p className="text-xs">
                With {input.attachments.length} attachment(s).
              </p>
            )}

            <MessageOperationErrorText error={error} />
          </div>
        </MessageRow.Row>

        {error && (
          <section className="absolute top-0 right-2 hidden -translate-y-1/2 flex-row items-center gap-2 rounded-md border-2 border-gray-500 bg-gray-600 px-2 py-1 shadow-md group-hover:flex">
            <IconButton
              theme="default"
              className="flex-1"
              onClick={retrySendOperation}
            >
              <FaRepeat className="size-5" />
            </IconButton>

            <IconButton
              theme="danger"
              className="flex-1"
              onClick={removeSendOperation}
            >
              <FaTrashCan className="size-5" />
            </IconButton>
          </section>
        )}
      </div>
    </div>
  );
}
