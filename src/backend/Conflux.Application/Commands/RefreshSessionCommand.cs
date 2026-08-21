using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record RefreshSessionCommand(string Email, string RefreshToken) : IRequest<Result<RefreshResponse>>;