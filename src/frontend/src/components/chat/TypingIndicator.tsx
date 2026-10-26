import useTypingIndicator from "../../hooks/useTypingIndicator.ts";
import {useEffect, useState} from "react";
import {useAuth} from "../../contexts/AuthContext.tsx";

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
      case 0: return null;
      case 1: return (
        <>
          <DisplayName name={renderedUsers[0].displayName}/> is typing...
        </>
      );
      case 2: return (
        <>
          <DisplayName name={renderedUsers[0].displayName}/> and <DisplayName name={renderedUsers[1].displayName}/> is typing...
        </>
      );
      case 3: return (
        <>
          <DisplayName name={renderedUsers[0].displayName}/>, <DisplayName name={renderedUsers[1].displayName}/> and <DisplayName name={typingUsers[2].displayName}/> is typing...
        </>
      );
      default: return <span className="font-semibold text-gray-200">Several people are typing...</span>;
    }
  };

  return (
    <div className="flex-none bg-gray-700 h-5 text-xs flex items-center px-4 overflow-hidden">
      {isVisible ? (
        <div className="flex items-center gap-3 w-full">
          <div className="flex items-center gap-1.5 select-none">
            <div>{renderTypingText()}</div>

            <div className="flex gap-0.5 items-center mt-1">
              <span className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      ) : null}
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