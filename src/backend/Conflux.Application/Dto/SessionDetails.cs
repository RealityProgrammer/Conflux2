using Conflux.Application.Enums;

namespace Conflux.Application.Dto;

public sealed record SessionDetails(
    Guid SessionId,
    string OperatingSystemInfo,
    string BrowserInfo,
    SessionDevice Device,
    long LastActivityMs
);