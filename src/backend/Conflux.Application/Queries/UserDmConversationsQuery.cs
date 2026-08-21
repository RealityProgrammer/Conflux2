using Conflux.Domain.Dto;

namespace Conflux.Application.Queries;

public sealed record UserDmConversationsQuery(
    Guid UserId, 
    int Offset, 
    int Count
) : IQuery<PaginatedResult<DmConversationListItemDto>>;