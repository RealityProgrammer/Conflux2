using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(FriendRequest), Include = [
    nameof(FriendRequest.Id),
    nameof(FriendRequest.Status),
    nameof(FriendRequest.Sender),
    nameof(FriendRequest.Receiver),
], NestedFacets = [
    typeof(UserIdentityProfileDto),
])]
public sealed partial record FriendRequestSummary;