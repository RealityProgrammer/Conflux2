namespace Conflux.Domain.Dto;

public sealed partial record ServerDetailsDto(
    Guid Id,
    string Name,
    bool HasAvatar,
    ICollection<ChannelCategoryDetailDto> ChannelCategories,
    ServerMemberAuthorizeInfoDto AuthorizeInfo
);