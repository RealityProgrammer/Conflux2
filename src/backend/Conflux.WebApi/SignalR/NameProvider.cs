namespace Conflux.WebApi.SignalR;

internal static class NameProvider {
    public static string GetServerGroupName(Guid serverId) => $"server:{serverId:N}";
    public static string GetChannelGroupName(Guid channelId) => $"channel:{channelId:N}";
}