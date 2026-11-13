using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record QueryServerChannelConversationDetails(
    Guid ServerId, 
    Guid ChannelId
) : IQuery<Result<ServerChannelConversationDetails>>;

public sealed class QueryServerChannelConversationDetailsHandler(
    ICurrentUserService currentUserService,
    IServerMemberRepository serverMemberRepository,
    IChannelRepository channelRepository,
    IConversationRepository conversationRepository
) : IQueryHandler<QueryServerChannelConversationDetails, Result<ServerChannelConversationDetails>> {
    public async ValueTask<Result<ServerChannelConversationDetails>> Handle(
        QueryServerChannelConversationDetails query, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid serverId = query.ServerId;

        if (!await serverMemberRepository.IsUserJoined(userId, serverId, cancellationToken)) {
            return Errors.Forbidden("User is not a member of server.");
        }
        
        Guid channelId = query.ChannelId;

        var channelInfo = await channelRepository
            .AsQueryable()
            .Where(c => c.Id == channelId)
            .SelectFacet<ServerChannelIdentityDto>()
            .FirstOrDefaultAsync(cancellationToken);

        if (channelInfo == null) {
            return Errors.ResourceNotFound("Channel", [
                new(nameof(Channel.Id), channelId.ToString()),
            ]);
        }

        Guid? conversationId = await conversationRepository
            .AsQueryable()
            .Where(c => c.ChannelId == channelId)
            .Select(c => c.Id)
            .Cast<Guid?>()
            .FirstOrDefaultAsync(cancellationToken);

        if (conversationId == null) {
            return Errors.ResourceNotFound("Conversation");
        }

        return Result<ServerChannelConversationDetails>.Success(new(channelInfo, conversationId.Value));
    }
}