using Conflux.Domain.Dto;

namespace Conflux.WebApi.SignalR;

public sealed record ServerChannelCreatedEvent(Guid ServerId, ServerChannelIdentityDto Channel);