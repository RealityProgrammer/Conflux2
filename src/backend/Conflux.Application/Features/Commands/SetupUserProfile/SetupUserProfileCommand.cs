using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Features.Commands.SetupUserProfile;

public sealed record SetupUserProfileCommand(
    Guid UserId,
    string UserName,
    string DisplayName,
    AvatarOperation AvatarOperation
) : ICommand<Result>;