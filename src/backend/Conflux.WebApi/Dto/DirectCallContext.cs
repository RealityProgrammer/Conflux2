using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.WebApi.Dto;

public sealed record DirectCallContext(Result Result, UserIdentityProfileDto? PeerProfile);