using Conflux.Application.Enums;
using Conflux.Application.Services;
using Conflux.Domain;
using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace Conflux.Application.Features.Conversation;

public sealed record ToggleReactionCommand(
    Guid MessageId, 
    string ReactionKey, 
    ReactionAction Action
) : ICommand<Result>;

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class ToggleReactionCommandValidator : AbstractValidator<ToggleReactionCommand> {
    public ToggleReactionCommandValidator() {
        RuleFor(c => c.Action)
            .IsInEnum()
            .WithMessage("Reaction action is undefined.");
    }
}

public sealed partial class ToggleReactionHandler(
    ICurrentUserService currentUserService,
    IMessageReactionBatcher reactionBatcher
) : ICommandHandler<ToggleReactionCommand, Result> {
    public async ValueTask<Result> Handle(ToggleReactionCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        string reactionKey = command.ReactionKey;
        
        if (!IsValidReactionKeyFormat(reactionKey)) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(ToggleReactionCommand.ReactionKey)] = [
                    "Invalid reaction key.",
                ],
            });
        }

        return await reactionBatcher.RecordDelta(userId, command.MessageId, reactionKey, command.Action, cancellationToken);
    }

    private bool IsValidReactionKeyFormat(string key) {
        if (string.IsNullOrWhiteSpace(key)) return false;
        if (key.Contains(':')) return false;
        
        if (key.StartsWith("server.")) {
            return Guid.TryParse(key.AsSpan("server.".Length), out _);
        }

        // TODO: Emoji check
        return true;
    }
    
    [GeneratedRegex("\\P{So}", RegexOptions.Compiled)]
    private static partial Regex UnicodeEmojiRegex { get; }
}