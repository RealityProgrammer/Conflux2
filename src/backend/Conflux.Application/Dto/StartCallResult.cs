using Conflux.Domain.Dto;

namespace Conflux.Application.Dto;

public sealed record StartCallResult(UserIdentityProfileDto CalleeProfile, TimelineMessageDto Message);