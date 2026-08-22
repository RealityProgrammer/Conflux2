using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record CommunityServerChannelIdentityDto(Guid Id, string Name, ChannelType ChannelType);

public sealed record ChannelCategoryIdentityDto(Guid? Id, string? Name, List<CommunityServerChannelIdentityDto> Channels);

public sealed record CommunityServerSummaryDto(
    string Name,
    string? Description,
    bool HasAvatar,
    List<ChannelCategoryIdentityDto> ChannelCategories
);