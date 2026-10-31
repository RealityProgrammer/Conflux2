using System.Text.Json.Serialization;

namespace Conflux.Application.Dto;

[JsonDerivedType(typeof(MentionFromDm), "dm")]
[JsonDerivedType(typeof(MentionFromServer), "server")]
public abstract record MentionSource(Guid MessageId);

public sealed record MentionFromDm(Guid PeerUserId, Guid MessageId) : MentionSource(MessageId);
public sealed record MentionFromServer(Guid ServerId, Guid ChannelId, Guid MessageId) : MentionSource(MessageId);