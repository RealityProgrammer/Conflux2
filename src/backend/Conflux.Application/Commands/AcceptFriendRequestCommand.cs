using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record AcceptFriendRequestCommand(Guid AcceptorUserId, Guid SenderUserId) : IRequest<Result>;