using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Exceptions;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record SendFriendRequestCommand(
    Guid ToUserId
) : ICommand<Result<UserRelationshipStatus>>;

public sealed record FriendRequestReceivedNotification(Guid ReceiverUserId, Guid SenderUserId) : INotification;

public sealed class SendFriendRequestHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository,
    TimeProvider timeProvider,
    IMediator mediator,
    IUnitOfWork unitOfWork
) : ICommandHandler<SendFriendRequestCommand, Result<UserRelationshipStatus>> {
    public async ValueTask<Result<UserRelationshipStatus>> Handle(SendFriendRequestCommand request, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        var toUserId = request.ToUserId;
        
        if (userId == toUserId) {
            return Errors.DisallowSelfAction("Self sending friend request is not allowed.");
        }
        
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        // check if there was a friend request between 2 users
        // if it's status is None or Rejected, update to Pending with sender and receiver assigned accordingly.

        var requestSummary = await friendRequestRepository.GetRequestSummary(userId, toUserId);
        
        if (requestSummary != null) {
            switch (requestSummary.Status) {
                case FriendRequestStatus.None or FriendRequestStatus.Rejected or FriendRequestStatus.Canceled:
                default:    // treat all other invalid states as stranger
                    // has friend request, but it has been in one of "stranger" states.
                    bool changed = await friendRequestRepository.ReactivateRequestAsPending(
                        requestSummary.Id, 
                        userId, 
                        toUserId, 
                        utcNow,
                        cancellationToken
                    );

                    if (changed) {
                        await mediator.Publish(new FriendRequestReceivedNotification(toUserId, userId), cancellationToken);
                        return Result<UserRelationshipStatus>.Success(UserRelationshipStatus.OutcomingRequest);
                    }
                    
                    return Errors.OperationFailure("send friend request");
                
                case FriendRequestStatus.Pending:
                    // idempotency: the user already requested to receiver
                    if (requestSummary.Sender.Id == userId) {
                        return Result<UserRelationshipStatus>.Success(UserRelationshipStatus.OutcomingRequest);
                    }
                    
                    // this user send request to the receiver, but the receiver already sent a request to this
                    // user, thus auto accept friend request
                    
                    bool success = await friendRequestRepository.TryTransitionStatus(
                        requestSummary.Id,
                        FriendRequestStatus.Pending,
                        FriendRequestStatus.Accepted,
                        DateTimeOffset.UtcNow,
                        cancellationToken
                    );

                    if (!success) {
                        return Errors.OperationFailure("reject friend request due to state changed.");
                    }
                    
                    await mediator.Publish(new FriendRequestAcceptedNotification(userId, toUserId), cancellationToken);

                    return Result<UserRelationshipStatus>.Success(UserRelationshipStatus.Friended);
                
                case FriendRequestStatus.Accepted:
                    return Result<UserRelationshipStatus>.Success(UserRelationshipStatus.Friended);
            }
        }
        
        FriendRequest newRequest = new() {
            SenderUserId = userId,
            ReceiverUserId = toUserId,
            Status = FriendRequestStatus.Pending,
            CreatedAt = utcNow,
        };

        friendRequestRepository.Add(newRequest);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
            
            await mediator.Publish(new FriendRequestReceivedNotification(toUserId, userId), cancellationToken);
            return Result<UserRelationshipStatus>.Success(UserRelationshipStatus.OutcomingRequest);
        } catch (UniqueConstraintException) {
            var acceptedId = await friendRequestRepository.TryAcceptReverseRequest(userId, toUserId, timeProvider.GetUtcNow(), cancellationToken);

            if (acceptedId.HasValue) {
                await mediator.Publish(new FriendRequestAcceptedNotification(toUserId, userId), cancellationToken);
                return Result<UserRelationshipStatus>.Success(UserRelationshipStatus.Friended);
            }

            // likely means the user just clicked "Add Friend" twice very fast.
            return Result<UserRelationshipStatus>.Success(UserRelationshipStatus.OutcomingRequest);
        }
    }
}