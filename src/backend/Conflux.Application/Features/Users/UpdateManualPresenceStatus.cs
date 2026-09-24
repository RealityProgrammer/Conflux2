using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Users;

public sealed record UpdateManualPresenceStatusCommand(Guid UserId, PresenceStatus Status) : ICommand<Result>;

public record UserPresenceChangedNotification(
    Guid UserId, 
    PresenceStatus OldStatus, 
    PresenceStatus NewStatus
) : INotification;

public sealed class UpdateManualPresenceStatusHandler(
    IPresenceService presenceService
) : ICommandHandler<UpdateManualPresenceStatusCommand, Result> {
    public async ValueTask<Result> Handle(UpdateManualPresenceStatusCommand command, CancellationToken cancellationToken) {
        await presenceService.SetManualPresenceStatus(command.UserId, command.Status);
        return Result.Success();
    }
}