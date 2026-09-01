using Conflux.Domain;

namespace Conflux.Application.Features.Commands.Unfriend;

public sealed record UnfriendCommand(Guid InvokerUserId, Guid FriendUserId) : ICommand<Result>;