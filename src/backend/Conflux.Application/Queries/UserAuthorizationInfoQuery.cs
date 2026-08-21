using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Queries;

public sealed record UserAuthorizationInfoQuery(string UserId) : IQuery<Result<UserAuthorizationInfo>>;