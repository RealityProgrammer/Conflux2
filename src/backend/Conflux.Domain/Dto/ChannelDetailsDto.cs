using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record ChannelDetailsDto(
    Guid Id,
    string Name,
    ChannelType Type,
    ServerMemberAuthorizeInfoDto AuthorizeInfo
);