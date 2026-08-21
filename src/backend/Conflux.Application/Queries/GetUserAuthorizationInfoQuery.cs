using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Queries;

public sealed record GetUserAuthorizationInfoQuery(string UserId) : IQuery<Result<UserAuthorizationInfo>>;