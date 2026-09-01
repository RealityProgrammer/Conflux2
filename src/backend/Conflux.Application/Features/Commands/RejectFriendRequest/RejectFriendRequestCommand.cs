using Conflux.Domain;

namespace Conflux.Application.Features.Commands.RejectFriendRequest;

public sealed record RejectFriendRequestCommand(Guid RejecterUserId, Guid SenderUserId) : ICommand<Result>;