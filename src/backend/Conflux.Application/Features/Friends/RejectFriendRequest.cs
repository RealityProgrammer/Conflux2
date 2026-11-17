using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Friends;

public sealed record RejectFriendRequestCommand(
    Guid RequestId
) : ICommand<Result>;

public sealed record FriendRequestRejectedNotification(Guid RequestId, Guid RejecterUserId, Guid SenderUserId) : INotification;

public sealed class RejectFriendRequestHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository,
    IMediator mediator,
    TimeProvider timeProvider,
    IUnitOfWork unitOfWork,
    ILogger<RejectFriendRequestHandler> logger
) : ICommandHandler<RejectFriendRequestCommand, Result> {
    public async ValueTask<Result> Handle(RejectFriendRequestCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        var friendRequest = await friendRequestRepository
            .AsQueryable()
            .Where(r => r.Id == command.RequestId && r.ReceiverUserId == userId)
            .FirstOrDefaultAsync(cancellationToken);

        if (friendRequest == null) {
            return Errors.ResourceNotFound("Friend request", [
                new(nameof(FriendRequest.Id), command.RequestId.ToString()),
                new(nameof(FriendRequest.ReceiverUserId), userId.ToString()),
            ]);
        }

        switch (friendRequest.Status) {
            case FriendRequestStatus.Rejected:
                // already rejected, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                friendRequest.Status = FriendRequestStatus.Rejected;
                friendRequest.UpdatedAt = timeProvider.GetUtcNow();
                
                try {
                    await unitOfWork.SaveChangesAsync(cancellationToken);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while rejecting friend request {id}.", friendRequest.Id);
                    return Errors.UnexpectedError();
                }

                await mediator.Publish(new FriendRequestRejectedNotification(
                    friendRequest.Id,
                    userId,
                    friendRequest.SenderUserId
                ), cancellationToken);
                return Result.Success();
            
            case FriendRequestStatus.Accepted:
                return Errors.AlreadyFriended();
            
            case FriendRequestStatus.Canceled:
                return Errors.FriendRequestCanceled();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request", [
                    new(nameof(FriendRequest.Id), command.RequestId.ToString()),
                    new(nameof(FriendRequest.ReceiverUserId), userId.ToString()),
                ]);
        }
    }
}
