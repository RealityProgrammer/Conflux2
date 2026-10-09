using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record GetChannelDetailsQuery(
    Guid ServerId, 
    Guid ChannelId, 
    Guid UserId
) : IQuery<Result<ChannelDetailsDto>>;

public sealed class GetChannelDetailsHandler(
    IChannelRepository channelRepository,
    IServerMemberReadRepository serverMemberRepository,
    IServerPermissionsProvider permissionsProvider
) : IQueryHandler<GetChannelDetailsQuery, Result<ChannelDetailsDto>> {
    public async ValueTask<Result<ChannelDetailsDto>> Handle(
        GetChannelDetailsQuery query, 
        CancellationToken cancellationToken
    ) {
        var authorizeResult = await permissionsProvider.GetUserAuthorizeInfo(
            query.ServerId,
            query.UserId,
            cancellationToken
        );

        if (!authorizeResult.IsSuccess) {
            return authorizeResult.Error;
        }
        
        var channelInfo = await channelRepository
            .AsQueryable()
            .Where(c => c.Id == query.ChannelId && c.CommunityServerId == query.ServerId)
            .Select(c => new {
                c.Id,
                c.Name,
                c.Type,
                c.ConversationId,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (channelInfo == null) {
            return Errors.ResourceNotFound("Channel", [
                new(nameof(Channel.Id), query.ChannelId.ToString()),
                new(nameof(Channel.CommunityServerId), query.ServerId.ToString()),
            ]);
        }
        
        return Result<ChannelDetailsDto>.Success(new(channelInfo.Id, channelInfo.Name, channelInfo.Type, channelInfo.ConversationId, authorizeResult.Value!));
    }
}