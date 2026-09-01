using Conflux.Domain;

namespace Conflux.Application.Features.Commands.CreateServerInvitation;

public sealed record CreateServerInvitationCommand(
    Guid CommunityServerId,
    int? MaxUses,
    TimeSpan? ValidDuration
) : ICommand<Result<string>>;