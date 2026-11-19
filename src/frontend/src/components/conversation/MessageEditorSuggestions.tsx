import { Suggestion } from "./Suggestion.tsx";
import type { MessageTextboxEditorRef, SuggestionData } from "./MessageTextboxEditor.tsx";
import type { UserIdentityProfileDto } from "../../api/types.ts";
import type { RefObject } from "react";
import type { SelectedEmoji } from "./EmojiPanel.tsx";

interface BaseProps {
  suggestion: SuggestionData | null;
  onSuggestionModeSelected: (mode: "e" | "m" | "t") => void;
  onEmojiSelected: (emoji: SelectedEmoji) => void;
  onTimestampSelected: (timestamp: Date) => void;
  onMentionUserSelected: (user: UserIdentityProfileDto) => void;
}

function Base({
  suggestion,
  onSuggestionModeSelected,
  onEmojiSelected,
  onTimestampSelected,
  onMentionUserSelected,
}: BaseProps) {
  if (!suggestion) return null;

  return (
    <>
      {suggestion.type === "mode" ? (
        <Suggestion.Mode
          className="absolute inset-x-2 bottom-full z-10 -translate-y-2 shadow-xl"
          onSelect={onSuggestionModeSelected}
        />
      ) : suggestion.type === "emoji" ? (
        <Suggestion.Emoji
          className="absolute inset-x-2 bottom-full z-10 -translate-y-2 shadow-xl"
          searchTerm={suggestion.searchTerm ?? ""}
          onSelect={onEmojiSelected}
        />
      ) : suggestion.type === "time" ? (
        <Suggestion.Time
          className="absolute inset-x-2 bottom-full z-10 -translate-y-2 shadow-xl"
          onSelect={onTimestampSelected}
        />
      ) : suggestion.type === "mention" ? (
        <Suggestion.Mention
          className="absolute inset-x-2 bottom-full z-10 -translate-y-2 shadow-xl"
          searchTerm={suggestion.searchTerm ?? ""}
          onSelect={onMentionUserSelected}
        />
      ) : null}
    </>
  );
}

interface DefaultProps {
  suggestion: SuggestionData | null;
  textboxEditorRef: RefObject<MessageTextboxEditorRef | null>;
  cursorPosition: number;
}

function Default({ suggestion, textboxEditorRef, cursorPosition }: DefaultProps) {
  return (
    <Base
      suggestion={suggestion}
      onSuggestionModeSelected={(mode) => {
        // cursor is after the start colon, insert the mode directly
        textboxEditorRef.current?.insertText(mode, suggestion!.startColonIndex + 1, cursorPosition);
      }}
      onEmojiSelected={(emoji) => {
        // replace from the starting colon with the full formatted emoji tag and a trailing space
        switch (emoji.type) {
          case "server-emoji":
            textboxEditorRef.current?.insertEmojiNode(
              emoji.id,
              suggestion!.startColonIndex,
              cursorPosition,
            );
            break;

          case "unicode-emoji":
            textboxEditorRef.current?.insertText(emoji.value, suggestion!.startColonIndex, cursorPosition);
            break;
        }
      }}
      onTimestampSelected={(timestamp) => {
        // replace from the starting colon with the formatted timestamp tag and a trailing space
        textboxEditorRef.current?.insertText(
          `:t${timestamp.getTime()}: `,
          suggestion!.startColonIndex,
          cursorPosition,
        );
      }}
      onMentionUserSelected={(user) => {
        // replace from the starting colon with the mention node and a trailing space
        textboxEditorRef.current?.insertMentionNode(
          { id: user.id, name: user.displayName ?? "???" },
          suggestion!.startColonIndex,
          cursorPosition,
        );
      }}
    />
  );
}

export const MessageEditorSuggestions = {
  Base,
  Default,
};
