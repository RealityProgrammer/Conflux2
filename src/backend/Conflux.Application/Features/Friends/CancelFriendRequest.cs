using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Friends;

public sealed record CancelFriendRequestCommand(
    Guid RequestId
) : ICommand<Result>;

public sealed record FriendRequestCanceledNotification(Guid RequestId, Guid SenderUserId, Guid ReceiverUserId) : INotification;

public sealed class CancelFriendRequestHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository,
    TimeProvider timeProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<CancelFriendRequestHandler> logger
) : ICommandHandler<CancelFriendRequestCommand, Result> {
    public async ValueTask<Result> Handle(CancelFriendRequestCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var friendRequest = await friendRequestRepository
            .AsQueryable()
            .Where(r => r.Id == command.RequestId && r.SenderUserId == userId)
            .FirstOrDefaultAsync(cancellationToken);

        if (friendRequest == null) {
            return Errors.ResourceNotFound("Friend request", [
                new(nameof(FriendRequest.Id), command.RequestId.ToString()),
                new(nameof(FriendRequest.SenderUserId), userId.ToString()),
            ]);
        }

        switch (friendRequest.Status) {
            case FriendRequestStatus.Canceled:
                // already canceled, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                friendRequest.Status = FriendRequestStatus.Canceled;
                friendRequest.UpdatedAt = timeProvider.GetUtcNow();
                
                try {
                    await unitOfWork.SaveChangesAsync(cancellationToken);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while cancelling friend request {id}.", friendRequest.Id);
                    return Errors.UnexpectedError();
                }
                
                await publisher.Publish(new FriendRequestCanceledNotification(
                    friendRequest.Id, 
                    friendRequest.SenderUserId, 
                    friendRequest.ReceiverUserId
                ), cancellationToken);
                return Result.Success();
            
            case FriendRequestStatus.Accepted:
                return Errors.AlreadyFriended();
            
            case FriendRequestStatus.Rejected:
                return Errors.FriendRequestRejected();
            
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request", [
                    new(nameof(FriendRequest.Id), command.RequestId.ToString()),
                    new(nameof(FriendRequest.SenderUserId), userId.ToString()),
                ]);
        }
    }
}