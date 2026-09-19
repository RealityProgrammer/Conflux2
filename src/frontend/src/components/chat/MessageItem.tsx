import {TimelineItem} from "./TimelineItem.ts";
import type {
  TimelineMessageClusterItemDto,
  TimelineMessageDto,
  UserIdentityProfileDto
} from "../../api/types.ts";
import {isValidElement, type ReactNode} from "react";
import type {TimelineContext} from "./TimelineContext.ts";
import {ContextMenu} from "radix-ui";
import UserAvatar from "../UserAvatar.tsx";
import {BsArrowReturnLeft, BsCopy, BsPencil, BsTrash} from "react-icons/bs";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import MessageAttachments from "./MessageAttachments.tsx";
import {toast} from "react-toastify";
import {formatDate} from "date-fns";
import Markdown from "react-markdown";
import {Prism as SyntaxHighlighter} from "react-syntax-highlighter";
import {a11yDark} from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type MessageItemProps = {
  senderProfile?: UserIdentityProfileDto;
  replyToMessageSenderProfile?: UserIdentityProfileDto;
  message: TimelineMessageClusterItemDto;
  showHeader: boolean;
}

export class MessageItem extends TimelineItem<MessageItemProps> {
  constructor(data: MessageItemProps) {
    super(data);
  }

  getKey(): string {
    return `message_${this.data.message.id}`;
  }

  render(context: TimelineContext): ReactNode {
    return (
      <MessageView
        key={`message-${this.data.message.id}`}
        senderProfile={this.data.senderProfile}
        replyToMessageSenderProfile={this.data.replyToMessageSenderProfile}
        message={this.data.message}
        showHeader={this.data.showHeader}
        context={context}
      />
    );
  }
}

interface MessageViewProps {
  senderProfile?: UserIdentityProfileDto;
  replyToMessageSenderProfile?: UserIdentityProfileDto;
  message: TimelineMessageClusterItemDto;
  showHeader: boolean;
  context: TimelineContext;
}

function MessageView({
  senderProfile,
  message,
  showHeader,
  context,
  replyToMessageSenderProfile
}: MessageViewProps) {
  const auth = useAuthorization();

  const handleAttachmentClicked = (index: number) => {
    context.actions.onAttachmentClick(message.attachments, index);
  };

  const handleExternalLinkClicked = (url?: string)=> {
    context.actions.onExternalLinkClicked(url);
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className="w-full flex flex-col"
      >
        <div className="hover-highlight px-2 group">
          {message.replyTo && replyToMessageSenderProfile && (
            <div className="min-w-0">
              <p className="text-xs ml-13">
                {buildReplyText(replyToMessageSenderProfile.displayName ?? "???", message.replyTo.bodySnippet, message.replyTo.hasMoreBody, message.replyTo.attachmentCount)}
              </p>
            </div>
          )}

          <div className="flex flex-row gap-3">
            {showHeader ? (
              <>
                <UserAvatar
                  hasAvatar={senderProfile?.hasAvatar ?? false}
                  userId={senderProfile?.id ?? undefined}
                  className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {senderProfile?.userName ?? "Unknown Sender"}
                    {" "}
                    <span className="select-none font-normal text-xs text-gray-400 invisible group-hover:visible">
                      {formatDate(new Date(message.createdAt), "HH:mm")}
                    </span>
                  </p>

                  <MessageContentView
                    message={{...message, senderUserId: senderProfile!.id}}
                    onAttachmentClicked={handleAttachmentClicked}
                    onExternalLinkClicked={handleExternalLinkClicked}
                  />
                </div>
              </>
            ) : (
              <>
                <span className="select-none flex-none w-10 self-start mt-1 inline-flex justify-center items-center font-normal text-xs text-gray-400 invisible group-hover:visible">
                  {formatDate(new Date(message.createdAt), "HH:mm")}
                </span>

                <MessageContentView
                  message={{...message, senderUserId: senderProfile!.id}}
                  onAttachmentClicked={handleAttachmentClicked}
                  onExternalLinkClicked={handleExternalLinkClicked}
                />
              </>
            )}
          </div>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-60 overflow-hidden rounded-md bg-gray-725 shadow-lg p-1 text-white text-sm border border-gray-500"
          alignOffset={5}
        >
          <ContextMenu.Item
            className="dropdown-item-default"
            onSelect={() => {
              context.actions.onMessageReplyTrigger({
                ...message,
                senderUserId: senderProfile?.id!,
              })
            }}
          >
            Reply Message <BsArrowReturnLeft className="fill-white size-4 ml-auto"/>
          </ContextMenu.Item>

          {auth.userAuthorization?.id && auth.userAuthorization.id === senderProfile?.id && (
            <>
              <ContextMenu.Item
                className="dropdown-item-default"
                onSelect={() => {
                  context.actions.onMessageEditTrigger({
                    ...message,
                    senderUserId: senderProfile.id,
                  });
                }}
              >
                Edit message <BsPencil className="fill-white size-4 ml-auto"/>
              </ContextMenu.Item>

              <ContextMenu.Item
                className="dropdown-item-danger"
                onSelect={() => {
                  context.actions.onMessageDeleteTrigger({
                    ...message,
                    senderUserId: senderProfile.id,
                  })
                }}
              >
                Delete message <BsTrash className="fill-red-500 size-4 ml-auto"/>
              </ContextMenu.Item>
            </>
          )}

          <ContextMenu.Separator className="horizontal-separator my-1.5"/>

          {message?.body && (
            <ContextMenu.Item
              className="dropdown-item-default"
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(message.body!);
                } catch {
                  toast.error("Failed to copy message body to clipboard, possible API error?")
                }
              }}
            >
              Copy text <BsCopy className="fill-white size-4 ml-auto"/>
            </ContextMenu.Item>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function buildReplyText(name: string, content: string | null, ellipsis: boolean, attachmentCount: number) {
  const attachmentText = attachmentCount > 0 ? `${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''}` : '';

  return `@${name} sent${content ? `: ${content}${ellipsis ? '...' : ''}${attachmentCount ? ` (with ${attachmentText})` : ''}` : ` ${attachmentText}`}`;
}

function MessageContentView({
                              message,
                              onAttachmentClicked,
                              onExternalLinkClicked,
                            }: {
  message: TimelineMessageDto,
  onAttachmentClicked: (index: number) => void,
  onExternalLinkClicked: (url: string) => void
}) {
  return (
    <>
      {message.body && message.body.length > 0 && (
        <div className="text-sm leading-6 w-full">
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            children={message.body}
            components={{
              // heading
              h1: ({ children, node, ...props }) => (
                <h1 className="text-2xl font-bold mt-4 mb-2 whitespace-pre-wrap wrap-break-word" {...props}>
                  {children}
                </h1>
              ),
              h2: ({ children, node, ...props }) => (
                <h2 className="text-xl font-bold mt-3 mb-2 whitespace-pre-wrap wrap-break-word" {...props}>
                  {children}
                </h2>
              ),
              h3: ({ children, node, ...props }) => (
                <h3 className="text-lg font-bold mt-3 mb-1.5 whitespace-pre-wrap wrap-break-word" {...props}>
                  {children}
                </h3>
              ),
              h4: ({ children, node, ...props }) => (
                <h4 className="text-base font-bold mt-2 mb-1 whitespace-pre-wrap wrap-break-word" {...props}>
                  {children}
                </h4>
              ),
              h5: ({ children, node, ...props }) => (
                <h5 className="text-sm font-bold mt-2 mb-1 whitespace-pre-wrap wrap-break-word" {...props}>
                  {children}
                </h5>
              ),
              h6: ({ children, node, ...props }) => (
                <h6 className="text-xs font-bold mt-2 mb-1 whitespace-pre-wrap wrap-break-word" {...props}>
                  {children}
                </h6>
              ),

              // codeblock
              pre: ({ children, ...props }) => {
                if (isValidElement(children)) {
                  const codeProps = children.props as any;
                  const className = codeProps.className ?? "";
                  const match = /language-(\w+)/.exec(className);

                  if (match) {
                    return (
                      <SyntaxHighlighter
                        children={String(codeProps.children).replace(/\n$/, "")}
                        language={match[1]}
                        style={a11yDark}
                        className="border-2 border-gray-500 overflow-hidden w-full"
                      />
                    );
                  }

                  return (
                    <pre
                      className="block w-full overflow-x-auto bg-black/8 p-2 border-2 border-gray-500 rounded-md my-1"
                      {...props}
                    >
                            <code className={className}>{codeProps.children}</code>
                          </pre>
                  );
                }

                return <pre {...props}>{children}</pre>;
              },

              code: ({ className, children, node, ...props }) => {
                return (
                  <code
                    className={`${className ?? ""} bg-black/8 px-1.5 py-0.5 rounded-md inline-block`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },

              // list and task list (Removed whitespace-normal)
              ul: ({ children, className, node, ...props }) => {
                const isTaskList = className?.includes('contains-task-list');

                return (
                  <ul className={`${isTaskList ? "ml-1 list-none" : "list-disc ml-5"}`} {...props}>
                    {children}
                  </ul>
                );
              },
              ol: ({ children, className, node, ...props }) => {
                return (
                  <ol className="list-decimal ml-5 my-1" {...props}>
                    {children}
                  </ol>
                );
              },
              // Added wrapping classes to list items
              li: ({ children, className, node, ...props }) => {
                const isTaskListItem = className?.includes('task-list-item');

                return (
                  <li className={`${isTaskListItem ? "flex items-start gap-2" : ""} whitespace-pre-wrap wrap-break-word ${className ?? ""}`} {...props}>
                    {children}
                  </li>
                );
              },
              // Added wrapping classes to paragraphs
              p: ({ children, node, ...props }) => (
                <p className="mb-2 last:mb-0 whitespace-pre-wrap wrap-break-word" {...props}>
                  {children}
                </p>
              ),

              // link
              a: ({children, node, className, href, ...props}) => {
                if (href?.startsWith("#")) {
                  return (
                    <a
                      className={`${className ?? ""} text-blue-400 cursor-pointer`}
                      {...props}
                    >
                      {children}
                    </a>
                  )
                } else {
                  return (
                    <a
                      target="_blank"
                      className={`${className ?? ""} text-blue-400 cursor-pointer`}
                      onClick={(e) => {
                        if (!href) return;

                        onExternalLinkClicked(href);
                        e.preventDefault();
                      }}
                      {...props}
                    >
                      {children}
                    </a>
                  )
                }
              },

              // table
              table: ({ children, node, ...props }) => (
                <div className="w-full overflow-x-auto my-3 border border-gray-500 rounded-md">
                  <table className="w-full text-left border-collapse min-w-0" {...props}>
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children, node, ...props }) => (
                <thead className="bg-white/5 border-b border-gray-500" {...props}>{children}</thead>
              ),
              // Added wrapping classes to table cells just in case of long text/links
              th: ({ children, node, ...props }) => (
                <th className="px-3 py-2 font-semibold border-r border-gray-500 last:border-r-0 whitespace-pre-wrap wrap-break-word" {...props}>{children}</th>
              ),
              td: ({ children, node, ...props }) => (
                <td className="px-3 py-2 border-t border-r border-gray-500 last:border-r-0 whitespace-pre-wrap wrap-break-word" {...props}>{children}</td>
              ),

              // section (Removed whitespace-normal)
              section: ({ children, node, className, ...props }) => {
                if (className?.includes("footnotes")) {
                  return (
                    <section
                      className={`border-t border-gray-500 text-xs text-gray-300 mt-4 pt-3 ${className ?? ""}`}
                    >
                      {children}
                    </section>
                  );
                } else {
                  return (
                    <section className={className} {...props}>{children}</section>
                  );
                }
              },

              // input
              input: ({ type, checked, ...props }) => {
                if (type === 'checkbox') {
                  return (
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="mt-1.5 shrink-0"
                      {...props}
                    />
                  );
                }
                return <input type={type} {...props} />;
              },
            }}
          />
        </div>
      )}

      {message.attachments && message.attachments.length > 0 && (
        <MessageAttachments
          attachments={message.attachments}
          onAttachmentClick={onAttachmentClicked}
        />
      )}
    </>
  );
}