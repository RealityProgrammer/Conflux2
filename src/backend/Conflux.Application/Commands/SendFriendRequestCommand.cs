using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Commands;

public sealed record SendFriendRequestCommand(Guid FromUserId, Guid ToUserId) : ICommand<Result<UserRelationshipStatus>>;