using Conflux.Domain;

namespace Conflux.Application.Features.Commands.AcceptFriendRequest;

public sealed record AcceptFriendRequestCommand(Guid AcceptorUserId, Guid SenderUserId) : ICommand<Result>;