using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed partial record ChannelDetailsDto(
    Guid Id,
    string Name,
    ChannelType Type,
    Guid ConversationId,
    ServerMemberAuthorizeInfoDto AuthorizeInfo
);