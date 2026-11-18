import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { isValidElement, lazy, useEffect } from "react";
import { requestExternalLinkNavigate } from "../../store/useExternalLinkDialog.ts";
import { visit } from "unist-util-visit";
import type { Literal, Node, Parent } from "unist";
import { Emoji } from "../Emoji.tsx";
import { Separator, Tooltip } from "radix-ui";
import { Avatar } from "../Avatar.tsx";
import { useGetEmojiDetailsQuery } from "../../graphql/queries.ts";
import { useDeadEmojiStore } from "../../store/useDeadEmojiStore.ts";
import Timestamp from "./Timestamp.tsx";
import Mention from "./Mention.tsx";
const CodeBlock = lazy(() => import("./CodeBlock.tsx"));

interface MessageContentProps {
  content: string | null;
  className?: string;
}

function remarkCustomTokens() {
  return (tree: Node) => {
    visit(
      tree,
      "text",
      (node: any, index: number | undefined, parent: Parent | undefined) => {
        if (!parent || parent.type === "code" || parent.type === "inlineCode") {
          // TODO: also ignore quote and blockquote
          return;
        }

        const value = node.value;

        const regex = /:t(\d+):|:e([\da-f\-]+):|:m([\da-f\-]+):/g;
        if (!regex.test(value)) return;

        regex.lastIndex = 0;
        let match;
        let lastIndex = 0;
        const newChildren: Node[] = [];

        while ((match = regex.exec(value)) !== null) {
          const matchStart = match.index;
          const matchEnd = regex.lastIndex;

          if (matchStart > lastIndex) {
            newChildren.push({
              type: "text",
              value: value.slice(lastIndex, matchStart),
            } as Literal);
          }

          const timestampMatch = match[1];
          const emojiMatch = match[2];
          const mentionMatch = match[3];

          if (timestampMatch) {
            const ms = Number(timestampMatch) || 0;
            newChildren.push({
              type: "html",
              value: `<span data-chat-timestamp="${ms}"></span>`,
            } as Literal);
          } else if (emojiMatch) {
            newChildren.push({
              type: "html",
              value: `<span data-chat-emoji="${emojiMatch}"></span>`,
            } as Literal);
          } else if (mentionMatch) {
            newChildren.push({
              type: "html",
              value: `<span data-chat-mention-userid="${mentionMatch}"></span>`,
            } as Literal);
          }

          lastIndex = matchEnd;
        }

        if (lastIndex < value.length) {
          newChildren.push({
            type: "text",
            value: value.slice(lastIndex),
          } as Literal);
        }

        if (index !== undefined && parent.children) {
          parent.children.splice(index, 1, ...newChildren);
          return index + newChildren.length;
        }
      },
    );
  };
}

const markdownComponents: Components = {
  // heading
  h1: ({ children, node, ...props }) => (
    <h1 className="message-h1 wrap-break-word whitespace-pre-wrap" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, node, ...props }) => (
    <h2 className="message-h2 wrap-break-word whitespace-pre-wrap" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, node, ...props }) => (
    <h3 className="message-h3 wrap-break-word whitespace-pre-wrap" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, node, ...props }) => (
    <h4 className="message-h4 wrap-break-word whitespace-pre-wrap" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, node, ...props }) => (
    <h5 className="message-h5 wrap-break-word whitespace-pre-wrap" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, node, ...props }) => (
    <h6 className="message-h6 wrap-break-word whitespace-pre-wrap" {...props}>
      {children}
    </h6>
  ),

  // codeblock
  pre: ({ children, ...props }) => {
    if (isValidElement(children)) {
      const codeProps = children.props as any;
      const className = codeProps.className ?? "";
      const match = /language-(\w+)/.exec(className);

      const code = String(codeProps.children).replace(/\n$/, "");

      return <CodeBlock language={match?.[1]} code={code} />;
    }

    return <pre {...props}>{children}</pre>;
  },

  code: ({ className = "", children, node, ...props }) => {
    return (
      <code
        className={`${className} message-inline-code inline-block`}
        {...props}
      >
        {children}
      </code>
    );
  },

  ul: ({ children, className = "", node, ...props }) => {
    const isTaskList = className?.includes("contains-task-list");

    return (
      <ul
        className={`${isTaskList ? "ml-1 list-none pl-5" : "message-ul"} ${className}`}
        {...props}
      >
        {children}
      </ul>
    );
  },
  ol: ({ children, className, node, ...props }) => {
    return (
      <ol className="message-ol" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ children, className = "", node, ...props }) => {
    const isTaskListItem = className?.includes("task-list-item");

    return (
      <li
        className={`${isTaskListItem ? "message-task-li" : "message-li"} wrap-break-word ${className}`}
        {...props}
      >
        {children}
      </li>
    );
  },

  p: ({ children, node, ...props }) => (
    <p
      className="mb-2 wrap-break-word whitespace-pre-wrap last:mb-0"
      {...props}
    >
      {children}
    </p>
  ),

  // link
  a: ({ children, node, className = "", href, ...props }) => {
    if (href?.startsWith("#")) {
      return (
        <a className={`${className} cursor-pointer text-blue-400`} {...props}>
          {children}
        </a>
      );
    } else {
      return (
        <a
          target="_blank"
          className={`${className} cursor-pointer text-blue-400`}
          onClick={(e) => {
            e.preventDefault();
            if (!href) return;
            requestExternalLinkNavigate(href);
          }}
          {...props}
        >
          {children}
        </a>
      );
    }
  },

  // table
  table: ({ children, node, ...props }) => (
    <div className="my-3 w-full overflow-x-auto rounded-md border border-gray-500">
      <table className="w-full min-w-0 border-collapse text-left" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, node, ...props }) => (
    <thead className="border-b border-gray-500 bg-white/5" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, node, ...props }) => (
    <th
      className="border-r border-gray-500 px-3 py-2 font-semibold wrap-break-word whitespace-pre-wrap last:border-r-0"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, node, ...props }) => (
    <td
      className="border-t border-r border-gray-500 px-3 py-2 wrap-break-word whitespace-pre-wrap last:border-r-0"
      {...props}
    >
      {children}
    </td>
  ),

  // section
  section: ({ children, node, className = "", ...props }) => {
    if (className?.includes("footnotes")) {
      return (
        <section
          className={`mt-4 border-t border-gray-500 pt-3 text-xs text-gray-300 ${className}`}
        >
          {children}
        </section>
      );
    } else {
      return (
        <section className={className} {...props}>
          {children}
        </section>
      );
    }
  },

  // input
  input: ({ type, checked, node, ...props }) => {
    if (type === "checkbox") {
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

  // blockquote
  blockquote: ({ children, ...props }) => (
    <blockquote className="message-quote" {...props}>
      {children}
    </blockquote>
  ),

  img: ({ ...props }) => (
    <img
      loading="lazy"
      className="my-1 max-h-48 max-w-48 rounded-md border border-gray-600 object-contain"
      {...props}
    />
  ),

  span: ({ ...props }) => {
    const timestampAttribute: string = (props as any)[
      "data-chat-timestamp"
    ] as string;

    if (timestampAttribute) {
      const timeMillisecond = Number(timestampAttribute);

      return <Timestamp date={new Date(timeMillisecond)} />;
    }

    const emojiAttribute: string = (props as any)["data-chat-emoji"] as string;
    if (emojiAttribute) {
      return <EmojiWithTooltip emojiId={emojiAttribute} />;
    }

    const mentionUserIdAttribute: string = (props as any)[
      "data-chat-mention-userid"
    ] as string;
    if (mentionUserIdAttribute) {
      return <Mention userId={mentionUserIdAttribute} />;
    }

    return <span {...props}></span>;
  },
};

export default function MessageBody({
  content,
  className = "",
}: MessageContentProps) {
  return (
    <>
      {content && content.length > 0 && (
        <div className={`w-full text-sm ${className}`}>
          <Markdown
            remarkPlugins={[[remarkGfm, {}], remarkMath, remarkCustomTokens]}
            rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "warn" }]]}
            children={content}
            components={markdownComponents}
          />

          {/* TODO: Edited status display */}
        </div>
      )}
    </>
  );
}

function EmojiWithTooltip({ emojiId }: { emojiId: string }) {
  const isKnownDead = useDeadEmojiStore((state) => state.isDead(emojiId));
  const markAsDead = useDeadEmojiStore((state) => state.markAsDead);

  const { data, isLoading, isError } = useGetEmojiDetailsQuery(
    {
      id: emojiId,
    },
    {
      enabled: !isKnownDead,
      staleTime: 30 * 60 * 1000, // 30 min stale time
      retry: 3,
    },
  );

  const isNotFound = !isLoading && !isError && data?.emoji === null;

  useEffect(() => {
    if (isError) {
      markAsDead(emojiId);
    }
  }, [isNotFound, emojiId, markAsDead]);

  if (isKnownDead || isNotFound) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Emoji.Root
            emojiId={emojiId}
            className="inline-block size-6 align-text-bottom"
          />
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={5}
            className="bg-gray-750 rounded-lg border-2 border-gray-600 p-2 text-sm text-white shadow-lg"
          >
            <p className="font-mono text-xs text-gray-400">:unknown_emoji:</p>
            <p className="text-[10px] text-gray-500">
              This emoji no longer exists.
            </p>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  if (isError) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Emoji.Root
            emojiId={emojiId}
            className="inline-block size-6 align-text-bottom"
          />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={5}
            className="bg-gray-750 rounded-lg border-2 border-gray-600 p-2 text-sm text-white shadow-lg"
          >
            <p className="text-xs text-red-400">
              Failed to load emoji details.
            </p>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Emoji.Root
          emojiId={emojiId}
          className="inline-block size-6 align-text-bottom"
        />
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={5}
          className="bg-gray-750 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 space-y-2 rounded-lg border-2 border-gray-600 p-2 text-sm text-white shadow-lg duration-150"
        >
          <div className="flex flex-row items-center gap-2">
            <Emoji.Root emojiId={emojiId} className="size-10 flex-none" />

            {data && data.emoji && !isLoading ? (
              <p className="flex-1 font-mono">:{data.emoji.shortCode}:</p>
            ) : (
              <div className="h-5 w-1/2 animate-pulse rounded-full bg-white/10"></div>
            )}
          </div>

          <Separator.Root className="horizontal-separator" />

          <div className="select-none">
            <p>This emoji is from:</p>

            <div className="mt-2 flex flex-row items-center gap-2">
              {data && data.emoji && !isLoading ? (
                <Avatar.Server
                  serverId={data.emoji.server.id}
                  version={data.emoji.server.avatarVersion}
                  className="size-10 flex-none overflow-hidden rounded-full"
                />
              ) : (
                <Avatar.Skeleton className="size-10 flex-none rounded-full" />
              )}

              <div className="flex-1">
                {data && data.emoji && !isLoading ? (
                  <>
                    <p className="font-semibold">{data.emoji.server.name}</p>
                    <p className="text-xs">
                      {data.emoji.server.numMembers} members
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-5 w-1/2 animate-pulse rounded-full bg-white/10"></div>
                    <div className="mt-1 h-4 w-1/3 animate-pulse rounded-full bg-white/10"></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
