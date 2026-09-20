using Conflux.WebApi.Dto;

namespace Conflux.WebApi.Services;

public interface ITypingIndicatorService {
    Task<TypingUserDto?> GetTypingUserAsync(string userId, CancellationToken cancellationToken = default);
}