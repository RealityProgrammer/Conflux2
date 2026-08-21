using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record CancelFriendRequestCommand(Guid SenderUserId, Guid ToUserId) : IRequest<Result>;