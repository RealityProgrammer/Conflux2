namespace Conflux.Application.Options;

public class InvitationOptions {
    public TimeSpan NeverUsedInactiveTimespan { get; set; } = TimeSpan.FromDays(7);
    public TimeSpan LastUsedInactiveTimespan { get; set; } = TimeSpan.FromDays(14);
}