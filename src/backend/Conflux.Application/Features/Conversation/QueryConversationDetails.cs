using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record QueryConversationDetails(
    Guid ConversationId
) : ICommand<Result<ConversationDetails>>;

internal sealed class QueryConversationDetailsHandler(
    ICurrentUserService currentUserService,
    IConversationRepository conversationRepository,
    IUserRepository userRepository
) : ICommandHandler<QueryConversationDetails, Result<ConversationDetails>> {
    public async ValueTask<Result<ConversationDetails>> Handle(
        QueryConversationDetails command, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        var conversationId = command.ConversationId;
        
        var conversationData = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .Select(c => new {
                c.Type,
                IsParticipant = c.Participants.Any(p => p.UserId == userId)
            })
            .FirstOrDefaultAsync(cancellationToken);

        switch (conversationData) {
            case null: goto default;
            
            case var _ when conversationData.Type == ConversationType.Direct:
                if (!conversationData.IsParticipant) goto default;

                UserIdentityProfileDto peerProfile = await conversationRepository
                    .AsQueryable()
                    .Where(c => c.Id == conversationId)
                    .Include(c => c.FriendRequest)
                    .Select(c =>
                        c.FriendRequest!.SenderUserId == userId ? c.FriendRequest.Receiver : c.FriendRequest.Sender
                    )
                    .SelectFacet<UserIdentityProfileDto>()
                    .SingleAsync(cancellationToken);

                return Result<ConversationDetails>.Success(new DirectConversationDetails(peerProfile));
            
            case var _ when conversationData.Type == ConversationType.Server:
                ServerChannelIdentityDto channelIdentity = await conversationRepository
                    .AsQueryable()
                    .Where(c => c.Id == conversationId)
                    .Include(c => c.Channel)
                    .Select(c => c.Channel)
                    .SelectFacet<ServerChannelIdentityDto>()
                    .SingleAsync(cancellationToken);
                
                return Result<ConversationDetails>.Success(new ServerConversationDetails(channelIdentity));
            
            default:
                return Errors.ResourceNotFound("Conversation", [
                    new(nameof(Domain.Entities.Conversation.Id), conversationId.ToString()),
                ]);
        }
    }
}