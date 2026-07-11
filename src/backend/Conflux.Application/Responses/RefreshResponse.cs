using Conflux.Domain;

namespace Conflux.Application.Responses;

public record RefreshResponse(ApplicationUser User, string AccessToken, string RefreshToken);