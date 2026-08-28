using Conflux.Application.Commands;
using Conflux.Application.Notifications;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class AcceptFriendRequestHandler(
    IFriendRequestRepository friendRequestRepository,
    IMediator mediator,
    TimeProvider timeProvider
) : ICommandHandler<AcceptFriendRequestCommand, Result> {
    public async ValueTask<Result> Handle(AcceptFriendRequestCommand request, CancellationToken cancellationToken) {
        var senderUserId = request.SenderUserId;
        var acceptorUserId = request.AcceptorUserId;
        
        var requestSummary = await friendRequestRepository.GetRequestSummary(senderUserId, acceptorUserId);
        
        if (requestSummary == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (requestSummary.Sender.Id == acceptorUserId) {
            return Errors.Forbidden("Only the receiver can accept request.");
        }

        switch (requestSummary.Status) {
            case FriendRequestStatus.Accepted:
                // idempotency, already friended, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                bool success = await friendRequestRepository.TryTransitionStatus(
                    requestSummary.Id,
                    FriendRequestStatus.Pending,
                    FriendRequestStatus.Accepted,
                    timeProvider.GetUtcNow(),
                    cancellationToken
                );

                if (success) {
                    await mediator.Publish(new FriendRequestAcceptedNotification(acceptorUserId, senderUserId), cancellationToken);
                    return Result.Success();
                }

                return Errors.OperationFailure("accept friend request due to state changed.");
            
            case FriendRequestStatus.Rejected:
                return Errors.FriendRequestRejected();
            
            case FriendRequestStatus.Canceled:
                return Errors.FriendRequestCanceled();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }
}