import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {type HTMLAttributes, isValidElement} from "react";
import IconButton from "../IconButton.tsx";
import {BsCopy} from "react-icons/bs";
import {Prism as SyntaxHighlighter} from "react-syntax-highlighter";
import {a11yDark} from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageContentProps {
  content: string | null;
  onLinkClicked?: (url: string) => void;
  className?: string;
}

export default function MessageContent({
  content,
  onLinkClicked,
  className,
}: MessageContentProps) {
  return (
    <>
      {content && content.length > 0 && (
        <div className={`text-sm leading-6 w-full ${className}`}>
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: "warn" }]]}
            children={content}
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

                  const code = String(codeProps.children).replace(/\n$/, "");

                  return (
                    <div className="relative group my-1">
                      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-800 text-xs text-gray-400 rounded-t-md border-2 border-b-0 border-gray-500">
                        <span>{match ? match[1] : "Unknown"}</span>

                        <IconButton
                          theme="default"
                          onClick={() => navigator.clipboard.writeText(code)}
                        >
                          <BsCopy className="size-4"/>
                        </IconButton>
                      </div>

                      <SyntaxHighlighter
                        children={code}
                        language={match?.[1]}
                        style={a11yDark}
                        className="mt-0! border-2! border-gray-500! rounded-t-none! rounded-b-md! overflow-hidden w-full"
                      />
                    </div>
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
                      className={`${className ?? ""} text-blue-400 ${onLinkClicked ? "cursor-pointer" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();

                        if (!href || !onLinkClicked) return;
                        onLinkClicked(href);
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
            }}
          />
        </div>
      )}
    </>
  );
}