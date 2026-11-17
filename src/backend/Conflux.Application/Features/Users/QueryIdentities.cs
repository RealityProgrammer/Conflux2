using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics.CodeAnalysis;

namespace Conflux.Application.Features.Users;

public sealed record QueryIdentities(List<Guid> Ids) : IQuery<Result<IReadOnlyList<UserIdentityProfileDto>>>;

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class QueryIdentitiesValidator : AbstractValidator<QueryIdentities> {
    public QueryIdentitiesValidator() {
        RuleFor(q => q.Ids)
            .Must(ids => ids.Count <= 40)
            .WithMessage("Identity query only allows 40 Ids at once.");
    }
}

public sealed class QueryIdentitiesHandler(
    IUserRepository userRepository
) : IQueryHandler<QueryIdentities, Result<IReadOnlyList<UserIdentityProfileDto>>> {
    public async ValueTask<Result<IReadOnlyList<UserIdentityProfileDto>>> Handle(
        QueryIdentities query, 
        CancellationToken cancellationToken
    ) {
        var list = await userRepository
            .AsQueryable()
            .Where(u => query.Ids.Contains(u.Id))
            .SelectFacet<UserIdentityProfileDto>()
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<UserIdentityProfileDto>>.Success(list);
    }
}