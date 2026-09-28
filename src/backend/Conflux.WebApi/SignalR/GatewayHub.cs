using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Conflux.WebApi.Dto;
using Conflux.WebApi.Services;
using Conflux.WebApi.Services.Implementations;
using Facet;
using Facet.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.SignalR;

[Authorize]
public sealed class GatewayHub(
    JoinTracker joinTracker,
    SignalRConnectionTracker connectionTracker,
    IServerPermissionsProvider serverPermissionsProvider,
    ITypingIndicatorService typingIndicatorService,
    IPresenceService presenceService,
    IFriendRequestRepository friendRequestRepository,
    IUserRepository userRepository,
    ICallingService callingService,
    ILogger<GatewayHub> logger
) : Hub<IConfluxClient> {
    // invoked by the frontend only
    public async Task JoinChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.AddToGroupAsync(connectionId, NameProvider.GetChannelGroupName(channelId));
        await joinTracker.IncrementChannelJoinCount(connectionId, channelId);
    }

    // invoked by the frontend only
    public async Task LeaveChannel(Guid channelId) {
        string connectionId = Context.ConnectionId;
        
        await Groups.RemoveFromGroupAsync(connectionId, NameProvider.GetChannelGroupName(channelId));
        await joinTracker.DecrementChannelJoinCount(connectionId, channelId);
    }

    // invoked by the frontend only
    public async Task JoinServer(Guid serverId) {
        await InternalLeaveServer(serverId);
        
        string connectionId = Context.ConnectionId;
        List<string> joinedGroups = [];

        // the base group (or global group, whatever you prefer)
        string baseGroup = NameProvider.GetServerGroupName(serverId);
        await Groups.AddToGroupAsync(connectionId, baseGroup);
        joinedGroups.Add(baseGroup);
        
        await joinTracker.IncrementServerJoinCount(connectionId, serverId);
        
        // join groups specify by read/write boundary of server permissions.
        string? userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid)) {
            return;
        }

        var getMemberAuthorizeInfo = 
            await serverPermissionsProvider.GetUserAuthorizeInfo(serverId, userIdGuid, Context.ConnectionAborted);

        if (!getMemberAuthorizeInfo.IsSuccess) {
            return;
        }

        var effectivePermissions = getMemberAuthorizeInfo.Value!.EffectivePermissions;

        if (effectivePermissions.Contains(ServerPermission.ManageMembers)) {
            string group = NameProvider.GetServerPermissionGroupName(serverId, ServerPermission.ManageMembers);
            await Groups.AddToGroupAsync(connectionId, group);
            joinedGroups.Add(group);
        }
        
        if (effectivePermissions.Contains(ServerPermission.ReadModerationLogs)) {
            string group = NameProvider.GetServerPermissionGroupName(serverId, ServerPermission.ReadModerationLogs);
            await Groups.AddToGroupAsync(connectionId, group);
            joinedGroups.Add(group);
        }
        
        // allow role viewing when there are either CreateRole or UpdateRole
        if (effectivePermissions.Contains(ServerPermission.CreateRole) || effectivePermissions.Contains(ServerPermission.UpdateRole)) {
            string group = NameProvider.GetServerViewRolePermissionGroupName(serverId);
            await Groups.AddToGroupAsync(connectionId, group);
            joinedGroups.Add(group);
        }

        Context.Items[$"server_groups:{serverId}"] = joinedGroups;
    }

    // invoked by the frontend only
    public async Task LeaveServer(Guid serverId) {
        await InternalLeaveServer(serverId);
    }
    
    private async Task InternalLeaveServer(Guid serverId) {
        string connectionId = Context.ConnectionId;
        string itemKey = $"server_groups:{serverId}";

        if (Context.Items.TryGetValue(itemKey, out var obj) && obj is List<string> joinedGroups) {
            foreach (var groupName in joinedGroups) {
                await Groups.RemoveFromGroupAsync(connectionId, groupName);
            }
            
            Context.Items.Remove(itemKey);
        } else {
            // fallback just in case
            await Groups.RemoveFromGroupAsync(connectionId, NameProvider.GetServerGroupName(serverId));
        }

        await joinTracker.DecrementServerJoinCount(connectionId, serverId);
    }
    
    // invoked by the frontend only
    public async Task NotifyTyping(string channelId) {
        if (!Guid.TryParse(channelId, out var channelIdGuid)) return;
        
        var userId = Context.UserIdentifier;
        if (userId == null) return;

        TypingUserDto? dto = await typingIndicatorService.GetTypingUserAsync(userId);
        if (dto == null) return;
        
        await Clients
            .OthersInGroup(NameProvider.GetChannelGroupName(channelIdGuid))
            .UserTyping(new(dto.UserId, dto.DisplayName, dto.AvatarRevision), Context.ConnectionAborted);
    }
    
    // invoked by the frontend only
    public async Task Heartbeat() {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            logger.LogDebug("User {id} invokes Heartbeat", userId);
            await connectionTracker.Heartbeat(userId, Context.ConnectionId);
        }
    }
    
    // invoked by the frontend only
    public async Task SetAutoIdle(bool idle) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            await presenceService.SetAutoIdle(userId, idle);
        }
    }
    
    // invoked by frontend only
    public async Task<DirectCallContext> StartDirectCall(Guid calleeUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var callerId)) {
            return new(Errors.InvalidIdentifier(), null);
        }

        Result lockResult = await callingService.TryLockCallerAndCallee(callerId, Context.ConnectionId, calleeUserId);

        if (!lockResult.IsSuccess) {
            return new(lockResult, null);
        }

        var profiles = await friendRequestRepository.AsQueryable()
            .Where(r => r.Status == FriendRequestStatus.Accepted)
            .Where(r => r.SenderUserId == callerId && r.ReceiverUserId == calleeUserId || r.SenderUserId == calleeUserId && r.ReceiverUserId == callerId)
            .Include(r => r.Sender)
            .Include(r => r.Receiver)
            .Select(r => new {
                Sender = new UserIdentityProfileDto {
                    Id = r.Sender.Id,
                    UserName = r.Sender.UserName,
                    DisplayName = r.Sender.DisplayName,
                    AvatarRevision = r.Sender.AvatarRevision,
                    BannerRevision = r.Sender.BannerRevision,
                },
                Receiver = new UserIdentityProfileDto {
                    Id = r.Receiver.Id,
                    UserName = r.Receiver.UserName,
                    DisplayName = r.Receiver.DisplayName,
                    AvatarRevision = r.Receiver.AvatarRevision,
                    BannerRevision = r.Receiver.BannerRevision,
                },
            })
            .FirstOrDefaultAsync();

        if (profiles == null) {
            return new(Errors.NoAcceptedFriendRequest(), null);
        }
        
        await Clients.User(calleeUserId.ToString()).IncomingDirectCall(new(profiles.Sender.Id == calleeUserId ? profiles.Receiver : profiles.Sender));

        return new(Result.Success(), profiles.Sender.Id == calleeUserId ? profiles.Sender : profiles.Receiver);
    }

    // invoked by frontend only
    public async Task<DirectCallContext> CancelDirectCall(Guid calleeUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var callerId)) {
            return new(Errors.InvalidIdentifier(), null);
        }

        Result result = await callingService.CancelCall(callerId, calleeUserId);

        if (!result.IsSuccess) {
            return new(result, null);
        }

        await Clients.User(calleeUserId.ToString()).DirectCallCanceled(new(callerId));
        return new(Result.Success(), null);
    }

    // invoked by frontend only
    public async Task<DirectCallContext> DenyDirectCall(Guid callerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var calleeId)) {
            return new(Errors.InvalidIdentifier(), null);
        }
        
        Result result = await callingService.DenyCall(callerUserId, calleeId);

        if (!result.IsSuccess) {
            return new(result, null);
        }

        await Clients.User(callerUserId.ToString()).DirectCallDenied(new(calleeId));
        return new(Result.Success(), null);
    }

    // invoked by frontend only
    public async Task<DirectCallContext> AcceptDirectCall(Guid callerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var calleeUserId)) {
            return new(Errors.InvalidIdentifier(), null);
        }

        Result result = await callingService.AcceptCall(callerUserId, calleeUserId, Context.ConnectionId);
        
        if (!result.IsSuccess) {
            return new(result, null);
        }
        
        await Clients.User(callerUserId.ToString()).DirectCallAccepted(new(calleeUserId));
        return new(Result.Success(), null);
    }
    
    // invoked by frontend only
    public async Task<DirectCallContext> EndDirectCall(Guid peerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return new(Errors.InvalidIdentifier(), null);
        }
        
        Domain.Result<Guid> peerIdResult = await callingService.EndCall(userId, peerUserId);
        
        if (!peerIdResult.IsSuccess) {
            return new(peerIdResult, null);
        }
        
        await Clients.User(peerIdResult.Value.ToString()).DirectCallEnded(new(userId));
        return new(Result.Success(), null);
    }
    
    // invoked by frontend only
    public async Task<DirectCallContext> GetCurrentRingingCall() {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return new(Errors.InvalidIdentifier(), null);
        }

        var peerIdResult = await callingService.GetCurrentRingingCall(userId);

        if (!peerIdResult.IsSuccess) {
            return new(peerIdResult, null);
        }

        // Fetch the peer's profile from your database so the UI can render their name/avatar
        var peerProfileResult = await userRepository.GetIdentityProfile(peerIdResult.Value);
        
        if (!peerProfileResult.IsSuccess) {
            return new(peerProfileResult, null);
        }

        return new(peerProfileResult, peerProfileResult.Value);
    }

    public override async Task OnConnectedAsync() {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            bool isFirstConnection = await connectionTracker.TrackConnection(userId, Context.ConnectionId);
            
            if (isFirstConnection) {
                await presenceService.UserConnected(userId);
            }
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception) {
        await joinTracker.DeleteAllJoinCounts(Context.ConnectionId);
        
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            bool isLastConnection = await connectionTracker.UntrackConnection(userId, Context.ConnectionId);

            if (isLastConnection) {
                await presenceService.UserDisconnected(userId);
            }

            await HandleDropCall(userId);
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    private async Task HandleDropCall(Guid userId) {
        var result = await callingService.DropCall(userId, Context.ConnectionId);
        if (!result.IsSuccess) return;

        await Clients.User(result.Value.ToString()).DirectCallDropped(new(userId));
    }
}