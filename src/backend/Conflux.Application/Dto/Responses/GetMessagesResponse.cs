using Conflux.Domain.Dto;

namespace Conflux.Application.Dto.Responses;

public sealed record GetMessagesResponse(
    List<TimelineMessageBlockDto> MessageGroups,
    List<UserIdentityProfileDto> Users,
    bool? HasMoreBefore,
    bool? HasMoreAfter
);