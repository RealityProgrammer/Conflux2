using Conflux.Domain.Dto;

namespace Conflux.WebApi.SignalR;

public sealed record MessageReceivedEvent(TimelineMessageDto TimelineMessage);