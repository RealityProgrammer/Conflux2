interface UseExtractInputSuggestionProps {
  text: string;
  cursorPosition: number;
}

export type UseExtractInputSuggestionResult = {
  type: "mode";
  startColonIndex: number;
} | {
  type: "emoji";
  startColonIndex: number;
  modeIndex: number;
  startPayloadIndex: number;
  searchTerm: string;
} | {
  type: "time";
  startColonIndex: number;
  modeIndex: number;
  startPayloadIndex: number;
  milliseconds: number;
  rawVal: string;
} | {
  type: "unknown";
  startColonIndex: number;
};

export default function useExtractInputSuggestion({
  text,
  cursorPosition
}: UseExtractInputSuggestionProps): UseExtractInputSuggestionResult | undefined {
  const textBeforeCursor = text.slice(0, cursorPosition);

  // prevent suggestion if immediately after a success node
  if (/:e[\w-]+:$/.test(textBeforeCursor) || /:t\d+:$/.test(textBeforeCursor)) {
    return undefined;
  }

  const emojiMatch = textBeforeCursor.match(/:e([\w-]*)$/);
  if (emojiMatch) {
    const startColonIndex = emojiMatch.index!;
    return {
      type: "emoji",
      startColonIndex,
      modeIndex: startColonIndex + 1,           // point to the "e"
      startPayloadIndex: startColonIndex + 2,   // point to the start of the search term
      searchTerm: emojiMatch[1] || "",
    };
  }

  const timeMatch = textBeforeCursor.match(/:t(\d*)$/);
  if (timeMatch) {
    const startColonIndex = timeMatch.index!;
    const rawVal = timeMatch[1];
    const rawValTrimmed = rawVal.trim();
    const milliseconds = rawValTrimmed ? Number(rawValTrimmed) || 0 : Date.now();

    return {
      type: "time",
      startColonIndex,
      modeIndex: startColonIndex + 1,           // point to the "t"
      startPayloadIndex: startColonIndex + 2,   // point to the start of the digits
      milliseconds,
      rawVal,
    };
  }

  if (textBeforeCursor.endsWith(":")) {
    return {
      type: "mode",
      startColonIndex: textBeforeCursor.length - 1
    };
  }

  const unknownMatch = textBeforeCursor.match(/:([^:\s]+)$/);
  if (unknownMatch) {
    return {
      type: "unknown",
      startColonIndex: unknownMatch.index!,
    };
  }

  return undefined;
}