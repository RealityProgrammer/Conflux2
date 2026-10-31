using System.Text.Json.Serialization;

namespace Conflux.Application.Dto;

[JsonDerivedType(typeof(MentionFromDm), "dm")]
[JsonDerivedType(typeof(MentionFromServer), "server")]
public abstract record MentionSource(Guid ConversationId, Guid MessageId);

public sealed record MentionFromDm(Guid ConversationId, Guid MessageId, Guid PeerUserId) : MentionSource(ConversationId, MessageId);
public sealed record MentionFromServer(Guid ConversationId, Guid MessageId, Guid ServerId, Guid ChannelId) : MentionSource(ConversationId, MessageId);