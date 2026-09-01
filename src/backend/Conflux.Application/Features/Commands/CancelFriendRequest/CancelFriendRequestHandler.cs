using Conflux.Application.Notifications;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Commands.CancelFriendRequest;

public sealed class CancelFriendRequestHandler(
    IFriendRequestRepository friendRequestRepository,
    TimeProvider timeProvider,
    IMediator mediator
) : ICommandHandler<CancelFriendRequestCommand, Result> {
    public async ValueTask<Result> Handle(CancelFriendRequestCommand request, CancellationToken cancellationToken) {
        var senderUserId = request.SenderUserId;
        var toUserId = request.ToUserId;
        
        var requestSummary = await friendRequestRepository.GetRequestSummary(senderUserId, toUserId);

        if (requestSummary == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (requestSummary.Sender.Id != senderUserId) {
            return Errors.Forbidden("Only the sender can cancel their own request.");
        }

        switch (requestSummary.Status) {
            case FriendRequestStatus.Canceled:
                // already canceled, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                bool success = await friendRequestRepository.TryTransitionStatus(
                    requestSummary.Id,
                    FriendRequestStatus.Pending,
                    FriendRequestStatus.Canceled,
                    timeProvider.GetUtcNow(),
                    cancellationToken
                );

                if (!success) {
                    return Errors.OperationFailure("cancel friend request due to state changed.");
                }

                await mediator.Publish(new FriendRequestCanceledNotification(senderUserId, toUserId), cancellationToken);
                return Result.Success();
            
            case FriendRequestStatus.Accepted:
                return Errors.AlreadyFriended();
            
            case FriendRequestStatus.Rejected:
                return Errors.FriendRequestRejected();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }
}