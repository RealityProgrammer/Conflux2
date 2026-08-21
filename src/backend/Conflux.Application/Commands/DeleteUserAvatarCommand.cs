using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record DeleteUserAvatarCommand(Guid UserId) : IRequest<Result>;