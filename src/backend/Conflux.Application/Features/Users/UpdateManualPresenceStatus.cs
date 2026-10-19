using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Users;

public sealed record UpdateManualPresenceStatusCommand(PresenceStatus Status) : ICommand<Result>;

public record UserPresenceChangedNotification(
    Guid UserId,
    PresenceStatus OldStatus, 
    PresenceStatus NewStatus
) : INotification;

public sealed class UpdateManualPresenceStatusHandler(
    ICurrentUserService currentUserService,
    IPresenceService presenceService
) : ICommandHandler<UpdateManualPresenceStatusCommand, Result> {
    public async ValueTask<Result> Handle(UpdateManualPresenceStatusCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        await presenceService.SetManualPresenceStatus(userId, command.Status);
        return Result.Success();
    }
}