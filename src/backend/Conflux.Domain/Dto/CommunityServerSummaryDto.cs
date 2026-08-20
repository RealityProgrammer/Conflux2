using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record CommunityServerChannelSummaryDto(Guid Id, string Name, ChannelType ChannelType);

public sealed record ChannelCategorySummaryDto(Guid? Id, string? Name, List<CommunityServerChannelSummaryDto> Channels);

public sealed record CommunityServerSummaryDto(
    string Name,
    string? Description,
    bool HasAvatar,
    List<ChannelCategorySummaryDto> ChannelCategories
);