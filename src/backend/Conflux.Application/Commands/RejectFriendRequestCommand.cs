using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record RejectFriendRequestCommand(Guid RejecterUserId, Guid SenderUserId) : ICommand<Result>;