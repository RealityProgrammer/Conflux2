using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Commands.SendFriendRequest;

public sealed record SendFriendRequestCommand(Guid FromUserId, Guid ToUserId) : ICommand<Result<UserRelationshipStatus>>;