using Conflux.Domain;

namespace Conflux.Application.Responses;

public record LoginResponse(ApplicationUser User, string TokenType, string AccessToken, string RefreshToken);