using Conflux.Domain.Dto;

namespace Conflux.Application.Dto;

public sealed record ServerChannelConversationDetails(
    ServerChannelIdentityDto ChannelIdentity,
    Guid ConversationId
);