using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Conversation;

public sealed record AcceptDirectCallCommand(
    Guid CallId, 
    string CalleeConnectionId
) : ICommand<Result>;

public sealed record CallAcceptedNotification(Guid CallId, Guid CalleeId, Guid CallerId) : INotification;

internal sealed class AcceptDirectCallHandler(
    ICurrentUserService currentUserService,
    ICallingService callingService,
    IPublisher publisher
) : ICommandHandler<AcceptDirectCallCommand, Result> {
    public async ValueTask<Result> Handle(AcceptDirectCallCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } calleeId) {
            return Errors.InvalidIdentifier();
        }
        
        Result<AcceptCallResult> result = await callingService.AcceptDirectCall(command.CallId, calleeId, command.CalleeConnectionId);

        if (!result.IsSuccess) {
            return result;
        }

        await publisher.Publish(new CallAcceptedNotification(result.Value!.CallId, calleeId, result.Value!.CallerId), CancellationToken.None);
        return Result.Success();
    }
}