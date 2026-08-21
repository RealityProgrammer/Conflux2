using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record ConfirmEmailCommand(string UserId, string ConfirmationCode) : ICommand<Result>;