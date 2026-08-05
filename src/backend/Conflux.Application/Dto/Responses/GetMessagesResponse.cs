using Conflux.Domain.Dto;

namespace Conflux.Application.Dto.Responses;

public sealed record GetMessagesResponse(
    List<MessageGroup> MessageGroups,
    List<UserBasicProfileSummary> Users,
    bool? HasMoreBefore,
    bool? HasMoreAfter
);