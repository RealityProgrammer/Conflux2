using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record ChannelMetadata(
    Guid ChannelId,
    Guid ConversationId,
    ChannelType ChannelType
);