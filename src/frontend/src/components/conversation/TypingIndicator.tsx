import useTypingIndicator from "../../hooks/useTypingIndicator.ts";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext.tsx";

export default function TypingIndicator() {
  const { userProfile } = useAuth();
  const { typingUsers } = useTypingIndicator(userProfile?.id ?? "");

  const [renderedUsers, setRenderedUsers] = useState(typingUsers);
  const isVisible = typingUsers.length > 0;

  useEffect(() => {
    if (typingUsers.length > 0) {
      setRenderedUsers(typingUsers);
    }
  }, [typingUsers]);

  const renderTypingText = () => {
    switch (renderedUsers.length) {
      case 0:
        return null;
      case 1:
        return (
          <>
            <DisplayName name={renderedUsers[0].displayName} /> is typing...
          </>
        );
      case 2:
        return (
          <>
            <DisplayName name={renderedUsers[0].displayName} /> and{" "}
            <DisplayName name={renderedUsers[1].displayName} /> is typing...
          </>
        );
      case 3:
        return (
          <>
            <DisplayName name={renderedUsers[0].displayName} />,{" "}
            <DisplayName name={renderedUsers[1].displayName} /> and{" "}
            <DisplayName name={typingUsers[2].displayName} /> is typing...
          </>
        );
      default:
        return <span className="font-semibold text-gray-200">Several people are typing...</span>;
    }
  };

  return (
    <div className="flex h-5 flex-none items-center overflow-hidden bg-gray-700 px-4 text-xs">
      {isVisible ? (
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center gap-1.5 select-none">
            <div>{renderTypingText()}</div>

            <div className="mt-1 flex items-center gap-0.5">
              <span
                className="size-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="size-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="size-1.5 animate-bounce rounded-full bg-gray-400"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DisplayName({ name }: { name: string }) {
  return <span className="font-semibold text-gray-200">{name}</span>;
}
