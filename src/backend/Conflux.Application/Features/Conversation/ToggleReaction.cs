using Conflux.Application.Enums;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
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
            .WithMessage("{PropertyName} is undefined.");
        
        RuleFor(c => c.ReactionKey)
            .Must(k => k.StartsWith("unicode.") || k.StartsWith("emoji."))
            .WithMessage("{PropertyName} must starts with \"unicode.\" or \"server.\" prefix.");

        RuleFor(c => c.ReactionKey)
            .Must(k => Guid.TryParse(k.AsSpan("emoji.".Length), out _))
            .When(c => c.ReactionKey.StartsWith("emoji."))
            .WithMessage("{PropertyName} must be a GUID.");

        RuleFor(c => c.ReactionKey)
            .Must(k => {
                int runeCount = 0;
                foreach (var _ in k.AsSpan("unicode.".Length).EnumerateRunes()) {
                    runeCount++;
                }

                return runeCount <= 7;
            })
            .When(c => c.ReactionKey.StartsWith("unicode."))
            .WithMessage("{PropertyName} must have value of an unicode string with less than or equals to 7 runes.");
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

        return await reactionBatcher.RecordDelta(userId, command.MessageId, reactionKey, command.Action, cancellationToken);
    }
}