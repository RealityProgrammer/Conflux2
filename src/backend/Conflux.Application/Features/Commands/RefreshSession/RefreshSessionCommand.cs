using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Features.Commands.RefreshSession;

public sealed record RefreshSessionCommand(string Email, string RefreshToken) : ICommand<Result<RefreshResponse>>;