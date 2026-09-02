using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record ChannelCategoryIdentityDto(Guid Id, string Name);

public sealed record ServerChannelIdentityDto(Guid Id, string Name, ChannelType ChannelType, Guid? CategoryId);

public sealed record ChannelCategoryDetailDto(Guid? Id, string? Name, IReadOnlyCollection<ServerChannelIdentityDto> Channels);

public sealed record ServerDetailDto(
    string Name,
    string? Description,
    bool HasAvatar,
    List<ChannelCategoryDetailDto> ChannelCategories
);