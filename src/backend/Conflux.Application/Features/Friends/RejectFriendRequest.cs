using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record RejectFriendRequestCommand(Guid RejecterUserId, Guid SenderUserId) : ICommand<Result>;

public sealed record FriendRequestRejectedNotification(Guid RejecterUserId, Guid SenderUserId) : INotification;

public sealed class RejectFriendRequestHandler(
    IFriendRequestRepository friendRequestRepository,
    IMediator mediator,
    TimeProvider timeProvider
) : ICommandHandler<RejectFriendRequestCommand, Result> {
    public async ValueTask<Result> Handle(RejectFriendRequestCommand request, CancellationToken cancellationToken) {
        var rejecterUserId = request.RejecterUserId;
        var senderUserId = request.RejecterUserId;
        
        var requestSummary = await friendRequestRepository.GetRequestSummary(senderUserId, rejecterUserId);

        if (requestSummary == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (requestSummary.Sender.Id == rejecterUserId) {
            return Errors.Forbidden("Only the receiver can reject request.");
        }

        switch (requestSummary.Status) {
            case FriendRequestStatus.Rejected:
                // idempotency, already rejected, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                bool success = await friendRequestRepository.TryTransitionStatus(
                    requestSummary.Id,
                    FriendRequestStatus.Pending,
                    FriendRequestStatus.Rejected,
                    timeProvider.GetUtcNow(),
                    cancellationToken
                );

                if (success) {
                    await mediator.Publish(new FriendRequestRejectedNotification(rejecterUserId, senderUserId), cancellationToken);
                    return Result.Success();
                }

                return Errors.OperationFailure("reject friend request due to state changed.");
            
            case FriendRequestStatus.Accepted:
                return Errors.AlreadyFriended();
            
            case FriendRequestStatus.Canceled:
                return Errors.FriendRequestCanceled();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }
}