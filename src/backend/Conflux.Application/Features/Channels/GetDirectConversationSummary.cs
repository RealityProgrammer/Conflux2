using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Channels;

public sealed record GetDirectConversationSummaryQuery(
    Guid UserId, 
    Guid PeerId
) : IQuery<Result<DirectConversationSummary>>;

public sealed class GetDirectConversationSummaryHandler(
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantRepository conversationParticipantRepository
) : IQueryHandler<GetDirectConversationSummaryQuery, Result<DirectConversationSummary>> {
    public async ValueTask<Result<DirectConversationSummary>> Handle(GetDirectConversationSummaryQuery query, CancellationToken cancellationToken) {
        var conversationResult = await directConversationProvider.GetOrCreate(query.UserId, query.PeerId, cancellationToken);

        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }
        
        Conversation conversation = conversationResult.Value!;

        UserIdentityProfileDto? peerProfile = await conversationParticipantRepository
            .AsQueryable()
            .Where(p => p.ConversationId == conversation.Id && p.UserId == query.PeerId)
            .Include(p => p.User)
            .Select(p => new UserIdentityProfileDto {
                Id = p.User.Id,
                DisplayName = p.User.DisplayName,
                UserName = p.User.UserName,
                AvatarRevision = p.User.AvatarRevision,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (peerProfile == null) {
            return Errors.ResourceNotFound("Conversation", [
                new("Conversation", conversation.Id.ToString()),
            ]);
        }

        return Result<DirectConversationSummary>.Success(new(
            conversation.Id,
            peerProfile
        ));
    }
}