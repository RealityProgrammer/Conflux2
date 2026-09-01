using Conflux.Domain;

namespace Conflux.Application.Features.Commands.JoinServer;

public sealed record JoinServerCommand(Guid UserId, string InvitationId) : ICommand<Result>;