namespace Conflux.Domain.Dto;

public sealed record DirectMessageChannelSummary(
    UserBasicProfileSummary OtherUser
);