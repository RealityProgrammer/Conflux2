using Conflux.Domain;

namespace Conflux.Application.Features.Commands.DeleteUserAvatar;

public sealed record DeleteUserAvatarCommand(Guid UserId) : ICommand<Result>;