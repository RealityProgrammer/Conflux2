using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Users;

public sealed record DeleteAccountCommand(
    Guid UserId,
    UserAccountDeleteReason Reason,
    string? ExtraMessage
) : ICommand<Result>;

public sealed record DeleteAccountHandler(
) : ICommandHandler<DeleteAccountCommand, Result> {
    public async ValueTask<Result> Handle(DeleteAccountCommand command, CancellationToken cancellationToken) {
        return Errors.UnexpectedError();
    }
}