using Conflux.Domain;

namespace Conflux.Application.Features.Commands.CancelFriendRequest;

public sealed record CancelFriendRequestCommand(Guid SenderUserId, Guid ToUserId) : ICommand<Result>;