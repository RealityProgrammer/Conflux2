namespace Conflux.Domain.Dto;

public readonly record struct ChannelResolutionResult(Guid ChannelId, ChannelResolutionStatus Status);