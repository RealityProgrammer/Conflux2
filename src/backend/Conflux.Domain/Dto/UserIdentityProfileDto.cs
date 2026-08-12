namespace Conflux.Domain.Dto;

public sealed record UserIdentityProfileDto(Guid Id, string UserName, string DisplayName, bool HasAvatar);