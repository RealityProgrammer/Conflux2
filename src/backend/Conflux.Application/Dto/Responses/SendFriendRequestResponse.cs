using Conflux.Domain.Dto;

namespace Conflux.Application.Dto.Responses;

public sealed record SendFriendRequestResponse(UserRelationshipStatus Status);