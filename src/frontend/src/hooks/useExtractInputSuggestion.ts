interface UseExtractInputSuggestionProps {
  text: string;
  cursorPosition: number;
}

type UseExtractInputSuggestionResult =
  { type: "none" | "unknown" } | (
    { suggestionStartPosition: number } & (
      { type: "mode" } |
      { type: "emoji", searchTerm?: string } |
      { type: "time", miliseconds: number }
    )
  )

export default function useExtractInputSuggestion({
  text,
  cursorPosition
}: UseExtractInputSuggestionProps): UseExtractInputSuggestionResult {
  const textBeforeCursor = text.slice(0, cursorPosition);

  // if sliced message end with a ":", show suggestion about the "mode" (could be either emoji, time, etc...)
  if (textBeforeCursor.endsWith(":")) return { type: "mode", suggestionStartPosition: textBeforeCursor.length - 1 };

  // emoji mode trigger ":e" or ":e[search_term]"
  const emojiMatch = textBeforeCursor.match(/:e([\w-]*)$/);
  if (emojiMatch) {
    return {
      type: "emoji",
      searchTerm: emojiMatch[1] || undefined,
      suggestionStartPosition: emojiMatch.index!,
    };
  }

  // time mode trigger ":t" or ":t[value]"
  const timeMatch = textBeforeCursor.match(/:t(\d*)$/);
  if (timeMatch) {
    const rawVal = timeMatch[1].trim();
    const miliseconds = rawVal ? Number(rawVal) || 0 : Date.now();
    return { 
      type: "time",
      miliseconds,
      suggestionStartPosition: timeMatch.index!,
    };
  }

  return { type: "unknown" };
}