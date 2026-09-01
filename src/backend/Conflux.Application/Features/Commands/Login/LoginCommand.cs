using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Features.Commands.Login;

public sealed record LoginCommand(string Email, string Password) : ICommand<Result<LoginResponse>>;