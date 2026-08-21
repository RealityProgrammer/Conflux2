using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record SetupUserProfileCommand(
    Guid UserId,
    string UserName,
    string DisplayName,
    AvatarOperation AvatarOperation
) : IRequest<Result>;