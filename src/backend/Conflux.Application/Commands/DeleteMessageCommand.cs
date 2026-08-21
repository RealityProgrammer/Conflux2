using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record DeleteMessageCommand(Guid RequesterUserId, Guid MessageId) : ICommand<Result>;