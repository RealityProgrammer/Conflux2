using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Conversation;

public sealed record AcceptCallCommand(Guid CallerId, Guid CalleeId, string CalleeConnectionId) : ICommand<Result>;

public sealed record CallAcceptedNotification(Guid CalleeId, Guid CallerId) : INotification;

internal sealed class AcceptCallHandler(
    ICallingService callingService,
    IPublisher publisher
) : ICommandHandler<AcceptCallCommand, Result> {
    public async ValueTask<Result> Handle(AcceptCallCommand command, CancellationToken cancellationToken) {
        Guid callerId = command.CallerId;
        Guid calleeId = command.CalleeId;
        
        Result result = await callingService.AcceptCall(callerId, calleeId, command.CalleeConnectionId);

        if (!result.IsSuccess) {
            return result;
        }

        await publisher.Publish(new CallAcceptedNotification(calleeId, callerId), CancellationToken.None);
        return Result.Success();
    }
}