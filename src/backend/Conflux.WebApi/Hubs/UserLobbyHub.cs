using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Hubs;

[Authorize]
public sealed class UserLobbyHub : Hub;