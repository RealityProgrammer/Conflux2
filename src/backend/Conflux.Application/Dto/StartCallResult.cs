using Conflux.Domain.Dto;

namespace Conflux.Application.Dto;

public sealed record StartCallResult(Guid CallId, UserIdentityProfileDto CalleeProfile, TimelineMessageDto Message);