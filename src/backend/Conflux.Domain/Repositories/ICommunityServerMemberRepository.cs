using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerMemberRepository {
    void Add(CommunityServerMember value);
}