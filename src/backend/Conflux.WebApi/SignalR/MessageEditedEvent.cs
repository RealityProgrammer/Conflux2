using Conflux.Domain.Dto;

namespace Conflux.WebApi.SignalR;

public sealed record MessageEditedEvent(MessageDto Message);