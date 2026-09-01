using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Queries.GetUserDmConversations;

public sealed class GetUserDmConversationsHandler(
    IChannelRepository channelRepository
) : IQueryHandler<GetUserDmConversationsQuery, PaginatedResult<DmConversationListItemDto>> {
    public async ValueTask<PaginatedResult<DmConversationListItemDto>> Handle(GetUserDmConversationsQuery query, CancellationToken cancellationToken) {
        return await channelRepository.GetUserConversations(query.UserId, query.Offset, query.Count);
    }
}