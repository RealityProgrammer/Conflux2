using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace Conflux.Application.Services.Implementations;

internal sealed partial class EmojiValidationService(
    IEmojiReadRepository emojiReadRepository
) : IEmojiValidationService {
    public async Task<Error> ValidateMessageEmojis(
        MarkdownDocument markdownDocument, 
        Guid userId, 
        CancellationToken cancellationToken
    ) {
        // extract emoji ids first.
        var emojiIds = new HashSet<Guid>();

        foreach (Block block in markdownDocument) {
            TraverseObject(block, emojiIds);
        }

        if (emojiIds.Count == 0) {
            return Error.None;
        }
        
        // extract server ids from emoji and check if user is member of that server
        var validEmojiCount = await emojiReadRepository
            .AsQueryable()
            .Where(e => emojiIds.Contains(e.Id) && e.Server.Members.Any(m => m.UserId == userId && m.Status == MembershipStatus.Active))
            .CountAsync(cancellationToken);

        return validEmojiCount != emojiIds.Count ? 
            Errors.Forbidden("You do not have permission to use one or more emojis in this message.") : 
            Error.None;

        static void TraverseObject(MarkdownObject markdownObject, HashSet<Guid> emojiIds) {
            while (true) {
                // skip these blocks
                if (markdownObject is CodeBlock or FencedCodeBlock or CodeInline) {
                    return;
                }

                switch (markdownObject) {
                    case ContainerBlock containerBlock:
                        foreach (var children in containerBlock) {
                            TraverseObject(children, emojiIds);
                        }
                        break;

                    case LeafBlock leafBlock:
                        if (leafBlock.Inline is { } inline) {
                            markdownObject = inline;
                            continue;
                        }
                        break;

                    case ContainerInline containerInline:
                        foreach (var children in containerInline) {
                            TraverseObject(children, emojiIds);
                        }
                        break;

                    case LiteralInline literalInline:
                        var text = literalInline.Content.AsSpan();

                        foreach (var match in EmojiRegex.EnumerateMatches(text)) {
                            ReadOnlySpan<char> slice = text.Slice(match.Index + 2, match.Length - 3);

                            if (Guid.TryParse(slice, out Guid emojiId)) {
                                emojiIds.Add(emojiId);
                            }
                        }
                        break;
                }
                break;
            }
        }
    }
    
    [GeneratedRegex(@":e([\da-f\-]+):", RegexOptions.Compiled)]
    private static partial Regex EmojiRegex { get; }
}