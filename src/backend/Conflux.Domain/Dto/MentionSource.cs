using System.Text.Json.Serialization;

namespace Conflux.Domain.Dto;

[JsonDerivedType(typeof(MentionFromDm), "dm")]
[JsonDerivedType(typeof(MentionFromServer), "server")]
public abstract record MentionSource(Guid ConversationId);

public sealed record MentionFromDm(Guid ConversationId, Guid PeerUserId) : MentionSource(ConversationId);
public sealed record MentionFromServer(Guid ConversationId, Guid ServerId, Guid ChannelId) : MentionSource(ConversationId);