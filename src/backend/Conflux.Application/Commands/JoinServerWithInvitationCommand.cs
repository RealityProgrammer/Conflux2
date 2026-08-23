using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record JoinServerWithInvitationCommand(Guid UserId, string InvitationId) : ICommand<Result>;