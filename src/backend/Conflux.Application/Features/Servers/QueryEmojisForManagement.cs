using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record QueryEmojisForManagement(Guid ServerId) : IQuery<Result<List<EmojiManagementDto>>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.ManageEmojis];
};

public sealed class QueryEmojisForManagementHandler(
    IEmojiReadRepository emojiReadRepository
) : IQueryHandler<QueryEmojisForManagement, Result<List<EmojiManagementDto>>> {
    public async ValueTask<Result<List<EmojiManagementDto>>> Handle(
        QueryEmojisForManagement query, 
        CancellationToken cancellationToken
    ) {
        var results = await emojiReadRepository
            .AsQueryable()
            .Where(e => e.ServerId == query.ServerId)
            .OrderBy(e => e.ShortCode)
            .Include(e => e.Creator)
            .ThenInclude(e => e.Avatar)
            .Select(e => new EmojiManagementDto(
                e.Id,
                e.ShortCode,
                e.CreatedAt,
                new(e.CreatorId, e.Creator.DisplayName!, e.Creator.Avatar == null ? null : e.Creator.Avatar.Version)
            ))
            .ToListAsync(cancellationToken);
        
        return Result<List<EmojiManagementDto>>.Success(results);
    }
}