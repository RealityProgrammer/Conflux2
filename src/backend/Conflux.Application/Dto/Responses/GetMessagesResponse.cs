using Conflux.Domain.Dto;

namespace Conflux.Application.Dto.Responses;

public sealed record GetMessagesResponse(
    List<TimelineMessageBlockDto> MessageGroups,
    List<UserBasicProfileDto> Users,
    bool? HasMoreBefore,
    bool? HasMoreAfter
);