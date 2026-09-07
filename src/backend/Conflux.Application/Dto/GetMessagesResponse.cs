using Conflux.Domain.Dto;

namespace Conflux.Application.Dto;

public sealed record GetMessagesResponse(
    List<TimelineMessageClusterDto> MessageGroups,
    List<UserIdentityProfileDto> Users,
    bool? HasMoreBefore,
    bool? HasMoreAfter
);