using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record LoginCommand(string Email, string Password) : IRequest<Result<LoginResponse>>;