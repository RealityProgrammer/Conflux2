using Conflux.Domain.Dto;

namespace Conflux.WebApi.SignalR;

public sealed record ServerChannelCategoryCreatedEvent(Guid ServerId, ChannelCategoryIdentityDto CategoryIdentity);