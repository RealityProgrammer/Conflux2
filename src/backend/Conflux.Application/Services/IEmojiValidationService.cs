using Conflux.Domain;
using Markdig.Syntax;

namespace Conflux.Application.Services;

public interface IEmojiValidationService {
    Task<Error> ValidateMessageEmojis(
        MarkdownDocument markdownDocument, 
        Guid userId, 
        CancellationToken cancellationToken
    );
}