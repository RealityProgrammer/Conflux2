import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import IconButton from "../IconButton.tsx";
import { BsCopy } from "react-icons/bs";
import { useEffect, useState } from "react";

interface CodeBlockProps {
  language?: string;
  code: string;
}

const loadedLanguages = new Set<string>();

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const lang = language ? language.toLowerCase() : "text";

  useEffect(() => {
    // If it's plain text or already loaded, skip fetching
    if (!language || language === "text" || loadedLanguages.has(language)) {
      setIsLoaded(true);
      return;
    }

    let isMounted = true;

    async function loadLanguage() {
      try {
        switch (language) {
          case "javascript":
          case "js": {
            const js =
              await import("react-syntax-highlighter/dist/esm/languages/prism/javascript");
            SyntaxHighlighter.registerLanguage("javascript", js.default);
            SyntaxHighlighter.registerLanguage("js", js.default);
            break;
          }
          case "typescript":
          case "ts": {
            const ts =
              await import("react-syntax-highlighter/dist/esm/languages/prism/typescript");
            SyntaxHighlighter.registerLanguage("typescript", ts.default);
            SyntaxHighlighter.registerLanguage("ts", ts.default);
            break;
          }
          case "python":
          case "py": {
            const py =
              await import("react-syntax-highlighter/dist/esm/languages/prism/python");
            SyntaxHighlighter.registerLanguage("python", py.default);
            SyntaxHighlighter.registerLanguage("py", py.default);
            break;
          }
          case "json": {
            const json =
              await import("react-syntax-highlighter/dist/esm/languages/prism/json");
            SyntaxHighlighter.registerLanguage("json", json.default);
            break;
          }
          case "html":
          case "xml": {
            const markup =
              await import("react-syntax-highlighter/dist/esm/languages/prism/markup");
            SyntaxHighlighter.registerLanguage("html", markup.default);
            SyntaxHighlighter.registerLanguage("xml", markup.default);
            break;
          }
          case "css": {
            const css =
              await import("react-syntax-highlighter/dist/esm/languages/prism/css");
            SyntaxHighlighter.registerLanguage("css", css.default);
            break;
          }
          case "rust":
          case "rs": {
            const rust =
              await import("react-syntax-highlighter/dist/esm/languages/prism/rust");
            SyntaxHighlighter.registerLanguage("rust", rust.default);
            SyntaxHighlighter.registerLanguage("rs", rust.default);
            break;
          }
          case "sql": {
            const sql =
              await import("react-syntax-highlighter/dist/esm/languages/prism/sql");
            SyntaxHighlighter.registerLanguage("sql", sql.default);
            break;
          }
          case "cs":
          case "c#":
          case "csharp": {
            const csharp =
              await import("react-syntax-highlighter/dist/esm/languages/prism/csharp");
            SyntaxHighlighter.registerLanguage("csharp", csharp.default);
            break;
          }

          default:
            setIsLoaded(true);
            return;
        }

        loadedLanguages.add(language);
        if (isMounted) setIsLoaded(true);
      } catch (err) {
        console.warn(`Failed to load grammar for language: ${language}`, err);
        if (isMounted) setIsLoaded(true);
      }
    }

    loadLanguage();

    return () => {
      isMounted = false;
    };
  }, [language]);

  return (
    <div className="group relative my-1">
      <div className="flex items-center justify-between rounded-t-md border-2 border-b-0 border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-400">
        <span>{language || "Unknown"}</span>

        <IconButton
          theme="default"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          <BsCopy className="size-4" />
        </IconButton>
      </div>

      {!isLoaded ? (
        <pre className="m-0 rounded-b-md border-2 border-gray-600 bg-gray-900 p-3 font-mono text-xs text-gray-400">
          <code>{code}</code>
        </pre>
      ) : (
        <SyntaxHighlighter
          children={code}
          language={lang}
          style={a11yDark}
          className="mt-0! w-full overflow-hidden rounded-t-none! rounded-b-md! border-2! border-gray-600!"
        />
      )}
    </div>
  );
}
