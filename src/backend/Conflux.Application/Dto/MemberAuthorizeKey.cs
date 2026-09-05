namespace Conflux.Application.Dto;

public sealed record MemberAuthorizeKey(Guid MemberId, Guid ServerId, Guid UserId);