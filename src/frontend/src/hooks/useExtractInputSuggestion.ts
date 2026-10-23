interface UseExtractInputSuggestionProps {
  text: string;
  cursorPosition: number;
}

type UseExtractInputSuggestionResult = 
  { type: "none" } |
  { type: "mode" } |
  { type: "emoji", searchTerm?: string } |
  { type: "time", miliseconds: number };
  // TODO: Coordinate system

export default function useExtractInputSuggestion({
  text,
  cursorPosition
}: UseExtractInputSuggestionProps): UseExtractInputSuggestionResult {
  const textBeforeCursor = text.slice(0, cursorPosition);

  // if sliced message end with a ":", show suggestion about the "mode" (could be either emoji, time, etc...)
  if (textBeforeCursor.endsWith(":")) return { type: "mode" };

  // emoji mode trigger ":e" or ":e[search_term]"
  const emojiMatch = textBeforeCursor.match(/:e([a-zA-Z0-9_-]*)$/);
  if (emojiMatch) {
    return {
      type: "emoji",
      searchTerm: emojiMatch[1] || undefined
    };
  }

  // time mode trigger ":t" or ":t[value]"
  const timeMatch = textBeforeCursor.match(/:t(.*)$/);
  if (timeMatch) {
    const rawVal = timeMatch[1].trim();
    const miliseconds = rawVal ? Number(rawVal) || 0 : Date.now();
    return { type: "time", miliseconds };
  }
  
  // fallback to emoji, might remove
  const fallbackEmojiMatch = textBeforeCursor.match(/:([a-zA-Z0-9_-]{2,}$)/);
  if (fallbackEmojiMatch) {
    return {
      type: "emoji",
      searchTerm: fallbackEmojiMatch[1],
    };
  }

  return { type: "none" };
}