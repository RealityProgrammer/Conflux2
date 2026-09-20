namespace Conflux.WebApi.Dto;

public sealed record TypingUserDto(Guid UserId, string DisplayName, bool HasAvatar);