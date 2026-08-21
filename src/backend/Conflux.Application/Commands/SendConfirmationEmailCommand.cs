using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record SendConfirmationEmailCommand(Guid UserId) : ICommand<Result>;