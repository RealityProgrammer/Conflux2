namespace Conflux.Domain.Dto;

public sealed partial record ServerDetailsDto(
    Guid Id,
    string Name,
    int? AvatarVersion,
    ICollection<ChannelCategoryDetailDto> ChannelCategories,
    ServerMemberAuthorizeInfoDto AuthorizeInfo
);