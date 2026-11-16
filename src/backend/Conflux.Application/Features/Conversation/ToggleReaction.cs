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

    private static bool IsValidReactionKeyFormat(string key) {
        if (string.IsNullOrWhiteSpace(key)) return false;
        if (key.Contains(':')) return false;
        
        if (key.StartsWith("emoji.")) {
            return Guid.TryParse(key.AsSpan("emoji.".Length), out _);
        }

        if (key.StartsWith("unicode.")) {
            // TODO: accurately validate emoji character values instead of just rune length.
            // https://unicode.org/Public/18.0.0/emoji/emoji-test.txt
            ReadOnlySpan<char> valueSpan = key.AsSpan("unicode.".Length);

            int runeCount = 0;
            foreach (var _ in valueSpan.EnumerateRunes()) {
                runeCount++;
            }

            return runeCount <= 7;
        }
        
        return false;
    }
}