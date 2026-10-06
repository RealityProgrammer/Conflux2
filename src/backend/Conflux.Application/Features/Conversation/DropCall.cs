using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Conversation;

public sealed record DropCallCommand(Guid UserId, string ConnectionId, bool IsLastConnection) : ICommand<Result>;

public sealed record CallDroppedNotification(Guid CallId, Guid DropperId, Guid PeerId) : INotification;

internal sealed class DropCallHandler(
    ICallingService callingService,
    IPublisher publisher
) : ICommandHandler<DropCallCommand, Result> {
    public async ValueTask<Result> Handle(DropCallCommand command, CancellationToken cancellationToken) {
        Result<DropCallResult> result = await callingService.DropUserCall(command.UserId, command.ConnectionId, command.IsLastConnection);

        if (!result.IsSuccess) {
            return Result.Success();
        }
        
        await publisher.Publish(new CallDroppedNotification(result.Value!.CallId, command.UserId, result.Value!.PeerId), CancellationToken.None);
        return result;
    }
}