using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Commands;

public sealed record EditMessageCommand(Guid SenderUserId, Guid MessageId, string? Body) : ICommand<Result<MessageDto>>;