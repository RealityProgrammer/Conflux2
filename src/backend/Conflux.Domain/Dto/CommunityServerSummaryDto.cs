namespace Conflux.Domain.Dto;

public sealed record ChannelSummaryDto(Guid Id, string Name);

public sealed record ChannelCategorySummaryDto(Guid? Id, string? Name, List<ChannelSummaryDto> Channels);

public sealed record CommunityServerSummaryDto(
    string Name,
    string? Description,
    bool HasAvatar,
    List<ChannelCategorySummaryDto> ChannelCategories
);