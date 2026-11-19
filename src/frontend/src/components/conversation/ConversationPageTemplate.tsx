import { type ReactNode } from "react";

interface TemplateProps {
  header: ReactNode;
  sidebar?: { show: boolean; content: ReactNode };
  main: ReactNode;
}

function Template({ header, sidebar, main }: TemplateProps) {
  return (
    <div className="flex size-full flex-col overflow-hidden bg-gray-700 text-white">
      <header className="bg-gray-750 flex h-10 flex-none flex-row items-center gap-2 border-b-2 border-b-gray-600 px-2 text-sm">
        {header}
      </header>

      <main className="relative flex min-h-0 w-full flex-1 flex-row overflow-hidden">
        <section className="min-w-0 flex-1">{main}</section>

        {sidebar && (
          <aside
            className={`bg-gray-725 absolute top-0 right-0 flex h-full w-80 flex-col border-l-2 border-l-gray-600 transition-transform duration-300 ease-in-out ${sidebar.show ? "translate-x-0 shadow-2xl" : "pointer-events-none translate-x-full"} lg:relative lg:top-auto lg:right-auto lg:h-auto lg:translate-x-0 lg:transition-[width,border-color] lg:duration-300 lg:ease-in-out ${sidebar.show ? "lg:w-80 lg:border-l-gray-600" : "lg:pointer-events-none lg:w-0 lg:border-l-0"} `}
          >
            {/* inner fixed-width container prevents content squishing during desktop width transition */}
            <div className="flex h-full w-80 flex-col overflow-hidden">{sidebar.content}</div>
          </aside>
        )}
      </main>
    </div>
  );
}

export const ConversationPageTemplate = {
  Template,
};
