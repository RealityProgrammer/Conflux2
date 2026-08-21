using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record UnfriendCommand(Guid InvokerUserId, Guid FriendUserId) : IRequest<Result>;