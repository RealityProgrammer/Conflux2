import type {TypingUser} from "../../hooks/useTypingIndicator.ts";
import UserAvatar from "../UserAvatar.tsx";
import {useEffect, useState} from "react";

interface TypingIndicatorProps {
  displayUsers: TypingUser[];
}

export default function TypingIndicator({
  displayUsers
}: TypingIndicatorProps) {
  const [renderedUsers, setRenderedUsers] = useState(displayUsers);
  const isVisible = displayUsers.length > 0;

  useEffect(() => {
    if (displayUsers.length > 0) {
      setRenderedUsers(displayUsers);
    }
  }, [displayUsers]);

  const renderTypingText = () => {
    switch (displayUsers.length) {
      case 0: return null;
      case 1: return (
        <>
          <DisplayName name={displayUsers[0].displayName}/> is typing...
        </>
      );
      case 2: return (
        <>
          <DisplayName name={displayUsers[0].displayName}/> and <DisplayName name={displayUsers[1].displayName}/> is typing...
        </>
      );
      case 3: return (
        <>
          <DisplayName name={displayUsers[0].displayName}/>, <DisplayName name={displayUsers[1].displayName}/> and <DisplayName name={displayUsers[2].displayName}/> is typing...
        </>
      );
      default: return <span className="font-semibold text-gray-200">Several people are typing...</span>;
    }
  };

  return (
    <div
      className={`flex-none overflow-hidden transition-[max-height,opacity] duration-500 ease-linear ${
        isVisible ? "max-h-15 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <section className="flex items-center gap-3 px-4 py-0.5 border-t border-t-gray-600 bg-gray-650 text-sm text-gray-400">
        <div className="flex -space-x-3">
          {renderedUsers.map((user) => (
            <UserAvatar
              key={user.id}
              id={user.id}
              hasAvatar={user.hasAvatar}
              className="size-7 rounded-full overflow-hidden ring-2 ring-gray-650"
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5 select-none">
          <div>{renderTypingText()}</div>

          <div className="flex gap-0.5 items-center mt-1">
            <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="size-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </section>
    </div>
  );
}

function DisplayName({name}: {name: string}) {
  return (
    <span className="font-semibold text-gray-200">
      {name}
    </span>
  );
}