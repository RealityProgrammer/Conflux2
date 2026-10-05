using Conflux.Application.Enums;
using MemoryPack;

namespace Conflux.Application.Dto;

[MemoryPackable]
public sealed partial record CallSessionState(CallState State, Guid PeerId);