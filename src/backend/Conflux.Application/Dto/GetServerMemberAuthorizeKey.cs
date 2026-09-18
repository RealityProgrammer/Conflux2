namespace Conflux.Application.Dto;

public sealed record GetServerMemberAuthorizeKey(Guid MemberId, Guid ServerId, Guid UserId);