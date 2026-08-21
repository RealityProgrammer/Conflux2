using Conflux.Application.Queries;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class UserDmConversationsQueryHandler(
    IChannelRepository channelRepository
) : IQueryHandler<UserDmConversationsQuery, PaginatedResult<DmConversationListItemDto>> {
    public async ValueTask<PaginatedResult<DmConversationListItemDto>> Handle(UserDmConversationsQuery query, CancellationToken cancellationToken) {
        return await channelRepository.GetUserConversations(query.UserId, query.Offset, query.Count);
    }
}