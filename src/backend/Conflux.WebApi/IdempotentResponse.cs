using MemoryPack;

namespace Conflux.WebApi;

[MemoryPackable]
public sealed partial record IdempotentResponse(string JsonBody, int StatusCode);