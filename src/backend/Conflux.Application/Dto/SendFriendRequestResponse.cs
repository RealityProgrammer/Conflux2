using Conflux.Domain.Enums;

namespace Conflux.Application.Dto;

public sealed record SendFriendRequestResponse(UserRelationshipStatus Status);