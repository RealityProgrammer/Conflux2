namespace Conflux.Application.Helpers;

public static class StringHelpers {
    public static (string? Snippet, bool HasMore) CutSnippet(string? body, int maxChars = 128, int maxWords = 16) {
        if (string.IsNullOrWhiteSpace(body)) return (body, false);

        int wordCount = 0;
        int lastSpaceIndex = -1;
        bool inWord = false;

        for (int i = 0; i < body.Length; i++) {
            if (i == maxChars) {
                int cutIndex = lastSpaceIndex > 0 ? lastSpaceIndex : maxChars;
                return (body[..cutIndex].TrimEnd(), true);
            }

            if (char.IsWhiteSpace(body[i])) {
                if (inWord) {
                    wordCount++;
                    lastSpaceIndex = i;
                    inWord = false;

                    if (wordCount == maxWords) {
                        return (body[..i].TrimEnd(), true);
                    }
                }
            } else {
                inWord = true;
            }
        }

        return (body, false);
    }
}