using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record CreateInvitationCommand(
    Guid CommunityServerId,
    int? MaxUses,
    TimeSpan? ValidDuration
) : ICommand<Result<string>>;