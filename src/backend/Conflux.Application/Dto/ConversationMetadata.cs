using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record ConversationMetadata(
    ConversationType Type,
    Guid? ServerId
);