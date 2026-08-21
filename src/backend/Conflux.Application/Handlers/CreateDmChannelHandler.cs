using Conflux.Application.Commands;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Handlers;

public sealed class CreateDmChannelHandler(
    IChannelRepository channelRepository,
    TimeProvider timeProvider,
    IUnitOfWork unitOfWork
) : ICommandHandler<CreateDmChannelCommand, Result<ChannelResolutionResult>> {
    public async ValueTask<Result<ChannelResolutionResult>> Handle(
        CreateDmChannelCommand command, 
        CancellationToken cancellationToken
    ) {
        FriendDmChannelSummaryDto? friendRequestSummary = await channelRepository.GetFriendDmChannelSummary(command.User1, command.User2);

        // no friend request, bail out early
        if (friendRequestSummary == null) {
            return Errors.NoFriendRequest();
        }

        // might not having accepted friend request, but there is a existing conversation channel, so return it
        if (friendRequestSummary.ChannelId is { } existingChannelId) {
            return Result<ChannelResolutionResult>.Success(new(existingChannelId, ChannelResolutionStatus.Existing));
        }
        
        // no existing conversation channel, so ensure the existing friend request is accepted before creating one
        if (friendRequestSummary.FriendStatus != FriendRequestStatus.Accepted) {
            return Errors.NoAcceptedFriendRequest();
        }
        
        // create the conversation channel

        DateTimeOffset utcNow = timeProvider.GetUtcNow();

        Channel channel = new() {
            Type = ChannelType.DirectMessage,
            Conversation = new(),
            CreatedAt = utcNow,
            FriendRequestId = friendRequestSummary.FriendRequestId,
        };

        channelRepository.Add(channel);
        
        try {
            await unitOfWork.SaveChangesAsync();
            return Result<ChannelResolutionResult>.Success(new(channel.Id, ChannelResolutionStatus.Created));
        } catch (DbUpdateException) {
            // potential concurrency when 2 creates happen at the same time.
            var raceConditionChannelId = await channelRepository.GetChannelIdFromFriendRequestId(friendRequestSummary.FriendRequestId);
            return Result<ChannelResolutionResult>.Success(new(raceConditionChannelId, ChannelResolutionStatus.Existing));
        }
    }
}