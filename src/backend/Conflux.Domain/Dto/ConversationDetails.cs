using System.Text.Json.Serialization;

namespace Conflux.Domain.Dto;

[JsonDerivedType(typeof(DirectConversationDetails), "direct")]
[JsonDerivedType(typeof(ServerConversationDetails), "server")]
public abstract record ConversationDetails;

public sealed record DirectConversationDetails(
    UserIdentityProfileDto PeerIdentity
) : ConversationDetails;

public sealed record ServerConversationDetails(
    ServerChannelIdentityDto ChannelIdentity
) : ConversationDetails;