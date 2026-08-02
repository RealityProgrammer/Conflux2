using Conflux.Domain.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Dto.Responses;

public sealed record SendFriendRequestResponse(UserRelationshipStatus Status);