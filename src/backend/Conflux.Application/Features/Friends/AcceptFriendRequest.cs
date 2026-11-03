using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Friends;

public sealed record AcceptFriendRequestCommand(
    Guid RequestId
) : ICommand<Result>;

public sealed record FriendRequestAcceptedNotification(Guid RequestId, Guid AcceptorUserId, Guid SenderUserId) : INotification;

public sealed class AcceptFriendRequestHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository,
    IConversationRepository conversationRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    IPublisher publisher,
    ILogger<AcceptFriendRequestHandler> logger
) : ICommandHandler<AcceptFriendRequestCommand, Result> {
    public async ValueTask<Result> Handle(AcceptFriendRequestCommand command, CancellationToken cancellationToken) {
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
            case FriendRequestStatus.Accepted:
                // already accepted, return success.
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                friendRequest.Status = FriendRequestStatus.Accepted;
                friendRequest.UpdatedAt = timeProvider.GetUtcNow();

                if (friendRequest.Conversation != null) {
                    Domain.Entities.Conversation conversation = new() {
                        Type = ConversationType.Direct,
                        FriendRequest = friendRequest,
                        Participants = [
                            new() {
                                UserId = friendRequest.SenderUserId,
                            },
                            new() {
                                UserId = friendRequest.ReceiverUserId,
                            },
                        ],
                    };

                    conversationRepository.Add(conversation);
                }

                try {
                    await unitOfWork.SaveChangesAsync(cancellationToken);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while accepting friend request {id}.", friendRequest.Id);
                    return Errors.UnexpectedError();
                }
                
                await publisher.Publish(new FriendRequestAcceptedNotification(friendRequest.Id, userId, friendRequest.SenderUserId), cancellationToken);
                return Result.Success();
            
            case FriendRequestStatus.Rejected:
                return Errors.FriendRequestRejected();
            
            case FriendRequestStatus.Canceled:
                return Errors.FriendRequestCanceled();
            
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request", [
                    new(nameof(FriendRequest.Id), command.RequestId.ToString()),
                    new(nameof(FriendRequest.ReceiverUserId), userId.ToString()),
                ]);
        }
    }
}