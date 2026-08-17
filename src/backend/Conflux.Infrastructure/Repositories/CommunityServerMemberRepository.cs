using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class CommunityServerMemberRepository(
    ApplicationDbContext dbContext
) : ICommunityServerMemberRepository {
    public void Add(CommunityServerMember value) {
        dbContext.CommunityServerMembers.Add(value);
    }
}