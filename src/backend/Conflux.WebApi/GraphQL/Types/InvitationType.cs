using Conflux.Application.Enums;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class InvitationType : ObjectType<Invitation> {
    protected override void Configure(IObjectTypeDescriptor<Invitation> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(i => i.Id);
        descriptor.Field(i => i.CommunityServerId);
        descriptor.Field(i => i.CommunityServer).Type<CommunityServerType>();
        descriptor.Field(i => i.MaxUses);
        descriptor.Field(i => i.CurrentUses);
        descriptor.Field(i => i.CreatedAt);
        descriptor.Field(i => i.ExpiresAt);
        
        // TODO: switch to DataLoader
        descriptor.Field("status")
            .Type<NonNullType<EnumType<InvitationStatus>>>()
            .ParentRequires<Invitation>(i => new {
                i.CommunityServerId,
                i.ExpiresAt,
                i.MaxUses,
                i.CurrentUses,
            })
            .Resolve(async ctx => {
                var invite = ctx.Parent<Invitation>();
                var timeProvider = ctx.Service<TimeProvider>();
        
                if (invite.ExpiresAt.HasValue && invite.ExpiresAt.Value <= timeProvider.GetUtcNow()) {
                    return InvitationStatus.Expired;
                }
        
                if (invite.MaxUses.HasValue && invite.CurrentUses >= invite.MaxUses.Value) {
                    return InvitationStatus.MaxUsesReached;
                }
        
                var httpContextAccessor = ctx.Service<IHttpContextAccessor>();
                var userIdClaim = httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        
                if (Guid.TryParse(userIdClaim, out var userId)) {
                    var memberRepo = ctx.Service<ICommunityServerMemberRepository>();
        
                    bool isJoined = await memberRepo.IsUserJoined(
                        userId,
                        invite.CommunityServerId,
                        ctx.RequestAborted);
        
                    if (isJoined) {
                        return InvitationStatus.AlreadyJoinedServer;
                    }
                }   // do we really need to handle invalid id case?
        
                return InvitationStatus.Valid;
            });
    }
}