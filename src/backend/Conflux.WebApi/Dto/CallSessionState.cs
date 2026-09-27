using Conflux.Application.Enums;
using MemoryPack;

namespace Conflux.WebApi.Dto;

[MemoryPackable]
public sealed partial record CallSessionState(CallState State, Guid PeerId, string? ConnectionId);