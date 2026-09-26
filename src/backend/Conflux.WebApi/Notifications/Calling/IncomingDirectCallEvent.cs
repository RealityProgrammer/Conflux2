using Conflux.Domain.Dto;

namespace Conflux.WebApi.Notifications.Calling;

public sealed record IncomingDirectCallEvent(UserIdentityProfileDto CallerProfile);