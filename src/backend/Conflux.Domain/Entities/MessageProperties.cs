using Conflux.Domain.Enums;

namespace Conflux.Domain.Entities;

public abstract record MessageProperties;

public sealed record CallProperties(CallEventType Type, TimeSpan Duration) : MessageProperties;