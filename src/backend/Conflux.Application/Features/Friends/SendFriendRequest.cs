using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Friends;

public sealed record SendFriendRequestCommand(
    Guid RecipientId
) : ICommand<Result<SendFriendRequestResult>>;

public sealed record FriendRequestReceivedNotification(
    Guid RequestId, 
    Guid SenderUserId, 
    Guid ReceiverUserId
) : INotification;

public sealed class SendFriendRequestHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository,
    TimeProvider timeProvider,
    IPublisher publisher,
    IUnitOfWork unitOfWork,
    ILogger<SendFriendRequestHandler> logger
) : ICommandHandler<SendFriendRequestCommand, Result<SendFriendRequestResult>> {
    public async ValueTask<Result<SendFriendRequestResult>> Handle(
        SendFriendRequestCommand request, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var recipientId = request.RecipientId;
        
        if (userId == recipientId) {
            return Errors.DisallowSelfAction("Self sending friend request is not allowed.");
        }
        
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        // check for existing friend request between user and recipient user
        FriendRequest? existingRequest = await friendRequestRepository
            .AsQueryable()
            .Where(r =>
                r.SenderUserId == userId && r.ReceiverUserId == recipientId ||
                r.SenderUserId == recipientId && r.ReceiverUserId == userId
            )
            .FirstOrDefaultAsync(cancellationToken);

        if (existingRequest == null) {
            FriendRequest newRequest = new() {
                SenderUserId = userId,
                ReceiverUserId = recipientId,
                Status = FriendRequestStatus.Pending,
            };
            
            friendRequestRepository.Add(newRequest);

            try {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            } catch (OperationCanceledException) {
                throw;
            } catch (Exception e) {
                logger.LogError(e, "Exception thrown while sending friend request from user {fromId} to user {toId}.", userId, recipientId);
                return Errors.UnexpectedError();
            }

            await publisher.Publish(new FriendRequestReceivedNotification(newRequest.Id, userId, recipientId), CancellationToken.None);
            return Result<SendFriendRequestResult>.Success(new(UserRelationshipStatus.OutcomingRequest, newRequest.Id));
        }

        switch (existingRequest.Status) {
            case FriendRequestStatus.None or FriendRequestStatus.Rejected or FriendRequestStatus.Canceled:
            default:
                // "deactivated" friend request, reactivate it
                existingRequest.SenderUserId = userId;
                existingRequest.ReceiverUserId = recipientId;
                existingRequest.Status = FriendRequestStatus.Pending;
                
                try {
                    await unitOfWork.SaveChangesAsync(cancellationToken);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while reactivating friend request from user {fromId} to user {toId}.", userId, recipientId);
                    return Errors.UnexpectedError();
                }

                await publisher.Publish(new FriendRequestReceivedNotification(existingRequest.Id, userId, recipientId), CancellationToken.None);
                return Result<SendFriendRequestResult>.Success(new(UserRelationshipStatus.OutcomingRequest, existingRequest.Id));
            
            case FriendRequestStatus.Pending:
                // check already sent
                if (existingRequest.SenderUserId == userId) {
                    return Result<SendFriendRequestResult>.Success(new(UserRelationshipStatus.OutcomingRequest, existingRequest.Id));
                }
                
                // auto accept friend request
                existingRequest.Status = FriendRequestStatus.Accepted;
                existingRequest.UpdatedAt = utcNow;
                
                try {
                    await unitOfWork.SaveChangesAsync(cancellationToken);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while auto-accepting friend request from user {fromId} to user {toId}.", existingRequest.SenderUserId, existingRequest.ReceiverUserId);
                    return Errors.UnexpectedError();
                }
                
                await publisher.Publish(new FriendRequestAcceptedNotification(existingRequest.Id, userId, recipientId), cancellationToken);
                return Result<SendFriendRequestResult>.Success(new(UserRelationshipStatus.Friended, existingRequest.Id));
            
            // already accepted, just return success
            case FriendRequestStatus.Accepted:
                return Result<SendFriendRequestResult>.Success(new(UserRelationshipStatus.Friended, existingRequest.Id));
        }
    }
}