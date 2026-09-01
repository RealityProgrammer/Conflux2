using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Queries.GetUserDmConversations;

public sealed record GetUserDmConversationsQuery(
    Guid UserId, 
    int Offset, 
    int Count
) : IQuery<PaginatedResult<DmConversationListItemDto>>;