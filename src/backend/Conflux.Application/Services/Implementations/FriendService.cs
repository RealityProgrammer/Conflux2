using Conflux.Application.Dto;
using Conflux.Application.Dto.Notifications;
using Conflux.Application.Dto.Responses;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Extensions;
using Conflux.Domain.Repositories;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Diagnostics;
using FriendRequestStatus = Conflux.Domain.FriendRequestStatus;

namespace Conflux.Application.Services.Implementations;

internal sealed class FriendService(
    IFriendRepository friendRepository,
    TimeProvider timeProvider,
    IMediator mediator
) : IFriendService {
    public async Task<Result<SendFriendRequestResponse>> SendFriendRequestAsync(Guid fromUserId, Guid toUserId) {
        if (fromUserId == toUserId) {
            return Errors.DisallowSelfAction("Self sending friend request is not allowed.");
        }
        
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        // check if there was a friend request between 2 users
        // if it's status is None or Rejected, update to Pending with sender and receiver assigned accordingly.

        var requestSummary = await friendRepository.GetRequestSummaryAsync(fromUserId, toUserId);
        
        if (requestSummary != null) {
            switch (requestSummary.Status) {
                case FriendRequestStatus.None or FriendRequestStatus.Rejected or FriendRequestStatus.Canceled:
                default:    // treat all other invalid states as stranger
                    // has friend request, but it has been in one of "stranger" states.
                    bool changed = await friendRepository.ReactivateRequestAsPendingAsync(
                        requestSummary.Id, 
                        fromUserId, 
                        toUserId, 
                        utcNow
                    );

                    if (changed) {
                        await mediator.Publish(new FriendRequestSentNotification(fromUserId, toUserId));
                        
                        return Result<SendFriendRequestResponse>.Success(new(
                            UserRelationshipStatus.OutcomingRequest
                        ));
                    }
                    
                    return Errors.OperationFailure("send friend request");
                
                case FriendRequestStatus.Pending:
                    // idempotency: the user already requested to receiver
                    if (requestSummary.SenderId == fromUserId) {
                        return Result<SendFriendRequestResponse>.Success(new(
                            UserRelationshipStatus.OutcomingRequest
                        ));
                    }
                    
                    // this user send request to the receiver, but the receiver already sent a request to this
                    // user, thus auto accept friend request
                    if (await friendRepository.AcceptRequestAsync(requestSummary.Id, utcNow)) {
                        await mediator.Publish(new FriendRequestAcceptedNotification(fromUserId, toUserId));
                    }

                    return Result<SendFriendRequestResponse>.Success(new(
                        UserRelationshipStatus.Friended
                    ));
                
                case FriendRequestStatus.Accepted:
                    return Result<SendFriendRequestResponse>.Success(new(
                        UserRelationshipStatus.Friended
                    ));
            }
        }
        
        // create and add request
        var status = await friendRepository.CreateOrResolveRequestAsync(fromUserId, toUserId, utcNow);

        switch (status) {
            case CreateFriendRequestStatus.Success or CreateFriendRequestStatus.AlreadyExist:
                await mediator.Publish(new FriendRequestSentNotification(fromUserId, toUserId));
                
                return Result<SendFriendRequestResponse>.Success(new(
                    UserRelationshipStatus.OutcomingRequest
                ));
            
            case CreateFriendRequestStatus.AutoAccept:
                await mediator.Publish(new FriendRequestAcceptedNotification(fromUserId, toUserId));
                
                return Result<SendFriendRequestResponse>.Success(new(
                    UserRelationshipStatus.Friended
                ));
            
            default:
                throw new UnreachableException();
        }
    }

    public async Task<Result> CancelFriendRequestAsync(Guid senderUserId, Guid toUserId) {
        DateTimeOffset utcNow = timeProvider.GetUtcNow();

        var requestSummary = await friendRepository.GetRequestSummaryAsync(senderUserId, toUserId);

        if (requestSummary == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (requestSummary.SenderId != senderUserId) {
            return Errors.Unauthorized("Only the sender can cancel their own request.");
        }

        switch (requestSummary.Status) {
            case FriendRequestStatus.Canceled:
                // idempotency, already canceled, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                bool changed = await friendRepository.CancelRequestAsync(requestSummary.Id, utcNow);
                
                if (changed) {
                    await mediator.Publish(new FriendRequestCanceledNotification(senderUserId, toUserId));
                    return Result.Success();
                }

                return Errors.OperationFailure("cancel friend request due to state changed.");
            
            case FriendRequestStatus.Accepted:
                return Errors.AlreadyFriended();
            
            case FriendRequestStatus.Rejected:
                return Errors.FriendRequestRejected();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }
    
    public async Task<Result> RejectFriendRequestAsync(Guid receiverUserId, Guid senderUserId) {
        // copy-paste from CancelFriendRequestAsync, future modification should be applied accordingly
        // if CancelFriendRequestAsync changes
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        var requestSummary = await friendRepository.GetRequestSummaryAsync(receiverUserId, senderUserId);

        if (requestSummary == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (requestSummary.SenderId == receiverUserId) {
            return Errors.Unauthorized("Only the receiver can reject request.");
        }

        switch (requestSummary.Status) {
            case FriendRequestStatus.Rejected:
                // idempotency, already rejected, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                bool changed = await friendRepository.RejectRequestAsync(requestSummary.Id, utcNow);

                if (changed) {
                    await mediator.Publish(new FriendRequestRejectedNotification(receiverUserId, senderUserId));
                    return Result.Success();
                }

                return Errors.OperationFailure("reject friend request due to state changed.");
            
            case FriendRequestStatus.Accepted:
                return Errors.AlreadyFriended();
            
            case FriendRequestStatus.Canceled:
                return Errors.FriendRequestCanceled();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }
    
    public async Task<Result> AcceptFriendRequestAsync(Guid receiverUserId, Guid senderUserId) {
        // copy-paste from RejectFriendRequestAsync, future modification should be applied accordingly
        // if CancelFriendRequestAsync changes
        DateTimeOffset utcNow = timeProvider.GetUtcNow();

        var requestSummary = await friendRepository.GetRequestSummaryAsync(senderUserId, receiverUserId);
        
        if (requestSummary == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (requestSummary.SenderId == receiverUserId) {
            return Errors.Unauthorized("Only the receiver can accept request.");
        }

        switch (requestSummary.Status) {
            case FriendRequestStatus.Accepted:
                // idempotency, already friended, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                bool changed = await friendRepository.AcceptRequestAsync(requestSummary.Id, utcNow);

                if (changed) {
                    await mediator.Publish(new FriendRequestAcceptedNotification(receiverUserId, senderUserId));
                    return Result.Success();
                }

                return Errors.OperationFailure("accept friend request due to state changed.");
            
            case FriendRequestStatus.Rejected:
                return Errors.FriendRequestRejected();
            
            case FriendRequestStatus.Canceled:
                return Errors.FriendRequestCanceled();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }

    public async Task<Result> UnfriendAsync(Guid invokerUserId, Guid otherUserId) {
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        var requestSummary = await friendRepository.GetRequestSummaryAsync(invokerUserId, otherUserId);
        
        if (requestSummary == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (requestSummary.Status != FriendRequestStatus.Accepted) {
            return Errors.NotFriend();
        }

        bool changed = await friendRepository.UnfriendAsync(requestSummary.Id, utcNow);

        if (changed) {
            await mediator.Publish(new UnfriendNotification(invokerUserId, otherUserId));
            return Result.Success();
        }

        return Errors.OperationFailure("unfriend due to state changed.");
    }
    
    public async Task<Result<PaginatedResult<DiscoverFriendSummary>>> DiscoverFriendsAsync(
        Guid searchingUserId,
        string? nameFilter, 
        int offset, 
        int count
    ) {
        var result = await friendRepository.GetPaginatedFriendDiscoveryAsync(
            searchingUserId, 
            nameFilter, 
            offset, 
            count
        );
        
        return Result<PaginatedResult<DiscoverFriendSummary>>.Success(result);
    }

    public async Task<Result<PaginatedResult<FriendSummary>>> QueryFriendsAsync(
        Guid searchingUserId, 
        string? nameFilter, 
        int offset, 
        int count
    ) {
        return Result<PaginatedResult<FriendSummary>>.Success(
            await friendRepository.GetPaginatedFriendsAsync(searchingUserId, nameFilter, offset, count)
        );
    }

    public async Task<Result<PaginatedResult<PendingFriendRequestSummary>>> QueryPendingRequestsAsync(
        Guid searchingUserId, 
        string? nameFilter, 
        int offset, 
        int count
    ) {
        return Result<PaginatedResult<PendingFriendRequestSummary>>.Success(
            await friendRepository.GetPaginatedPendingRequestsAsync(searchingUserId, nameFilter, offset, count)
        );
    }
}