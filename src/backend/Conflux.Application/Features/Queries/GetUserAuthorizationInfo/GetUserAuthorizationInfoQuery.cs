using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Features.Queries.GetUserAuthorizationInfo;

public sealed record GetUserAuthorizationInfoQuery(string UserId) : IQuery<Result<UserAuthorizationInfo>>;