namespace Conflux.WebApi.GraphQL.Dto;

public record MemberAuthorizeInfoDto(int AuthorizeLevel, List<PermissionEntry> Permissions);