namespace Conflux.Application.Options;

public class AuthOptions {
    public int AccessTokenDuration { get; set; } = TimeSpan.FromMinutes(30).Seconds;
    public int RefreshTokenDuration { get; set; } = TimeSpan.FromDays(7).Seconds;
}