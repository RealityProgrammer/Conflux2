using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Friends;

public sealed record DropCallCommand(Guid DropperId, string DropperConnectionId) : ICommand<Result>;

public sealed record CallDroppedNotification(Guid PeerId, Guid DropperId) : INotification;

internal sealed class DropCallHandler(
    ICallingService callingService,
    IPublisher publisher
) : ICommandHandler<DropCallCommand, Result> {
    public async ValueTask<Result> Handle(DropCallCommand command, CancellationToken cancellationToken) {
        Result<Guid> result = await callingService.DropCall(command.DropperId, command.DropperConnectionId);

        if (!result.IsSuccess) {
            return result;
        }

        await publisher.Publish(new CallDroppedNotification(result.Value, command.DropperId), CancellationToken.None);
        return result;
    }
}