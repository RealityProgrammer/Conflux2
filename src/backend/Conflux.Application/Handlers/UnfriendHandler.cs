using Conflux.Application.Commands;
using Conflux.Application.Notifications;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class UnfriendHandler(
    IFriendRequestRepository friendRequestRepository,
    IMediator mediator,
    TimeProvider timeProvider
) : ICommandHandler<UnfriendCommand, Result> {
    public async ValueTask<Result> Handle(UnfriendCommand request, CancellationToken cancellationToken) {
        var invokerUserId = request.InvokerUserId;
        var friendUserId = request.FriendUserId;
        
        var requestSummary = await friendRequestRepository.GetRequestSummary(invokerUserId, friendUserId);
        
        if (requestSummary == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (requestSummary.Status != FriendRequestStatus.Accepted) {
            return Errors.NotFriend();
        }
        
        bool success = await friendRequestRepository.TryTransitionStatus(
            requestSummary.Id,
            FriendRequestStatus.Accepted,
            FriendRequestStatus.None,
            timeProvider.GetUtcNow(),
            cancellationToken
        );

        if (success) {
            await mediator.Publish(new UnfriendNotification(invokerUserId, friendUserId), cancellationToken);
            return Result.Success();
        }

        return Errors.OperationFailure("unfriend due to state changed.");
    }
}