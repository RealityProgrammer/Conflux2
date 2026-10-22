using Conflux.Application.Enums;

namespace Conflux.Application.Dto;

public sealed record SessionInfo(
    string OperatingSystemInfo, 
    string BrowserInfo,
    SessionDevice Device,
    long LastActivityMs
);