using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed record DiscoverFriend(string SearchTerm) : IQuery<Result<FriendSearchResponse>>;

public sealed class DiscoverFriendHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository,
    IUserRepository userRepository
) : IQueryHandler<DiscoverFriend, Result<FriendSearchResponse>> {
    public async ValueTask<Result<FriendSearchResponse>> Handle(DiscoverFriend query, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        var searchTerm = query.SearchTerm;

        var targetUser = await (Guid.TryParse(searchTerm, out var searchUserId)
            ? userRepository.AsQueryable()
                .Where(u => u.Id == searchUserId)
                .Select(u => new {
                    u.Id,
                    Profile = new UserIdentityProfileDto(u.AvatarVersion, u.DisplayName, u.Id, u.UserName)
                })
                .FirstOrDefaultAsync(cancellationToken)
            : userRepository.AsQueryable()
                .Where(u => u.UserName == searchTerm)
                .Select(u => new {
                    u.Id,
                    Profile = new UserIdentityProfileDto(u.AvatarVersion, u.DisplayName, u.Id, u.UserName)
                })
                .FirstOrDefaultAsync(cancellationToken));

        if (targetUser == null) {
            return Result<FriendSearchResponse>.Success(new(FriendSearchStatus.NoUser, null));
        }

        if (targetUser.Id == userId) {
            return Result<FriendSearchResponse>.Success(new(FriendSearchStatus.DisallowSelf, null));
        }

        var friendRequest = await friendRequestRepository
            .AsQueryable()
            .Where(r =>
                (r.SenderUserId == userId && r.ReceiverUserId == targetUser.Id) ||
                (r.SenderUserId == targetUser.Id && r.ReceiverUserId == userId)
            )
            .Select(r => new { r.SenderUserId, r.Status, r.Id })
            .FirstOrDefaultAsync(cancellationToken);

        var relationshipStatus = friendRequest switch {
            null => UserRelationshipStatus.Stranger,
            { Status: FriendRequestStatus.Accepted } => UserRelationshipStatus.Friended,
            { Status: FriendRequestStatus.Pending } when friendRequest.SenderUserId == userId => UserRelationshipStatus.OutcomingRequest,
            { Status: FriendRequestStatus.Pending } => UserRelationshipStatus.IncomingRequest,
            _ => UserRelationshipStatus.Stranger,
        };

        return Result<FriendSearchResponse>.Success(new(FriendSearchStatus.Success, new(targetUser.Profile, relationshipStatus, friendRequest?.Id)));
    }
}