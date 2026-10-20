using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record UnfriendCommand(
    Guid InvokerUserId, 
    Guid FriendUserId
) : ICommand<Result>;

public sealed record UnfriendNotification(Guid InvokerUserId, Guid OtherUserId) : INotification;

public sealed class UnfriendHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository,
    IMediator mediator,
    TimeProvider timeProvider
) : ICommandHandler<UnfriendCommand, Result> {
    public async ValueTask<Result> Handle(UnfriendCommand request, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        var friendUserId = request.FriendUserId;
        var requestSummary = await friendRequestRepository.GetRequestSummary(userId, friendUserId);
        
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
            await mediator.Publish(new UnfriendNotification(userId, friendUserId), cancellationToken);
            return Result.Success();
        }

        return Errors.OperationFailure("unfriend due to state changed.");
    }
}