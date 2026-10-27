import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import {isValidElement, lazy} from "react";
import {requestExternalLinkNavigate} from "../../store/useExternalLinkDialog.ts";
import { visit } from "unist-util-visit";
import type { Node, Parent, Literal } from "unist";
import {formatDate} from "date-fns";
import {Emoji} from "../Emoji.tsx";
import {Tooltip, Separator} from "radix-ui";
import {Avatar} from "../Avatar.tsx";
import {useGetEmojiDetailsQuery} from "../../graphql/queries.ts";
const CodeBlock = lazy(() => import("./CodeBlock.tsx"));
import {BsExclamationTriangle} from "react-icons/bs";

interface MessageContentProps {
  content: string | null;
  className?: string;
}

function remarkCustomTokens() {
  return (tree: Node) => {
    visit(tree, "text", (node: any, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || parent.type === "code" || parent.type === "inlineCode") {
        // TODO: also ignore quote and blockquote
        return;
      }

      const value = node.value;

      const regex = /:t(\d+):|:e([\da-f-]+):/g
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

        if (timestampMatch !== undefined) {
          const ms = Number(timestampMatch) || 0;
          newChildren.push({
            type: "html",
            value: `<span data-chat-timestamp="${ms}"></span>`,
          } as Literal);
        }
        else if (emojiMatch !== undefined) {
          const emojiName = emojiMatch;
          newChildren.push({
            type: "html",
            value: `<span data-chat-emoji="${emojiName}"></span>`,
          } as Literal);
        }
        // TODO: @ mention

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
    });
  };
}

const markdownComponents: Components = {
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

      const code = String(codeProps.children).replace(/\n$/, "");

      return (
        <CodeBlock language={match?.[1]} code={code}/>
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

  li: ({ children, className, node, ...props }) => {
    const isTaskListItem = className?.includes('task-list-item');

    return (
      <li className={`${isTaskListItem ? "flex items-start gap-2" : ""} whitespace-pre-wrap wrap-break-word ${className ?? ""}`} {...props}>
        {children}
      </li>
    );
  },

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
            e.preventDefault();
            if (!href) return;
            requestExternalLinkNavigate(href);
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
  th: ({ children, node, ...props }) => (
    <th className="px-3 py-2 font-semibold border-r border-gray-500 last:border-r-0 whitespace-pre-wrap wrap-break-word" {...props}>{children}</th>
  ),
  td: ({ children, node, ...props }) => (
    <td className="px-3 py-2 border-t border-r border-gray-500 last:border-r-0 whitespace-pre-wrap wrap-break-word" {...props}>{children}</td>
  ),

  // section
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

  // blockquote
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-gray-500 pl-4 py-1 my-2 text-gray-300 italic bg-white/4 rounded-r-md"
      {...props}
    >
      {children}
    </blockquote>
  ),

  img: ({ ...props }) => (
    <img
      loading="lazy"
      className="max-w-48 max-h-48 rounded-md my-1 border border-gray-600 object-contain"
      {...props}
    />
  ),
  
  span: ({...props}) => {
    const timestampAttribute: string = (props as any)["data-chat-timestamp"] as string;
    
    if (timestampAttribute) {
      const timeMilisecond = Number(timestampAttribute);

      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-white/10 text-white text-sm rounded-md font-mono"
        >
          {formatDate(new Date(timeMilisecond), "yyyy/MM/dd HH:mm:ss.SSS")}
        </span>
      );
    }
    
    const emojiAttribute: string = (props as any)["data-chat-emoji"] as string;
    if (emojiAttribute) {
      return (
        <EmojiWithTooltip emojiId={emojiAttribute}/>
      );
    }
    
    return <span {...props}></span>
  },
};

export default function MessageBody({
  content,
  className,
}: MessageContentProps) {
  return (
    <>
      {content && content.length > 0 && (
        <div className={`text-sm leading-6 w-full ${className}`}>
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath, remarkCustomTokens]}
            rehypePlugins={[rehypeRaw, [ rehypeKatex, { strict: "warn" }]]}
            children={content}
            components={markdownComponents}
          />
        </div>
      )}
    </>
  );
}

function EmojiWithTooltip({ emojiId }: { emojiId: string }) {
  const { data, isLoading, isError } = useGetEmojiDetailsQuery({
    id: emojiId,
  }, {
    staleTime: 30 * 60 * 1000,  // 30 min stale time
    refetchOnWindowFocus: false,
    retry: false,
  });

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Emoji.Root
          emojiId={emojiId}
          className="size-6 inline-block align-text-bottom"
        />
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={5}
          className="bg-gray-750 rounded-lg shadow-lg text-white p-2 border-2 border-gray-600 text-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150 space-y-2"
        >
          {isError ? (
            <div className="size-full flex flex-col justify-center items-center gap-1">
              <BsExclamationTriangle className="size-8 fill-white"/>
              <p className="text-center select-none">Failed to load emoji details.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-row items-center gap-2">
                <Emoji.Root
                  emojiId={emojiId}
                  className="size-10 flex-none"
                />

                {data && data.emoji && !isLoading ? (
                  <p className="flex-1 font-mono">:{data.emoji.shortCode}:</p>
                ) : (
                  <div className="w-1/2 h-5 rounded-full bg-white/10 animate-pulse"></div>
                )}
              </div>

              <Separator.Root className="horizontal-separator"/>

              <div className="select-none">
                <p>This emoji is from:</p>

                <div className="flex flex-row items-center gap-2 mt-2">
                  {data && data.emoji && !isLoading ? (
                    <Avatar.Server
                      serverId={data.emoji.server.id}
                      version={data.emoji.server.avatar?.version}
                      className="flex-none size-10 rounded-full overflow-hidden"
                    />
                  ) : (
                    <Avatar.Skeleton className="flex-none size-10 rounded-full"/>
                  )}

                  <div className="flex-1">
                    {data && data.emoji && !isLoading ? (
                      <>
                        <p className="font-semibold">{data.emoji.server.name}</p>
                        <p className="text-xs">{data.emoji.server.numMembers} members</p>
                      </>
                    ) : (
                      <>
                        <div className="h-5 w-1/2 bg-white/10 animate-pulse rounded-full"></div>
                        <div className="h-4 w-1/3 bg-white/10 animate-pulse rounded-full mt-1"></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}