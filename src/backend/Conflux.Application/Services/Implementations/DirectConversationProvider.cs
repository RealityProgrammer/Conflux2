using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class DirectConversationProvider(
    IConversationRepository conversationRepository,
    IFriendRequestRepository friendRequestRepository,
    IUnitOfWork unitOfWork
) : IDirectConversationProvider {
    public async Task<Result<Conversation>> GetOrCreate(Guid user1Id, Guid user2Id, CancellationToken cancellationToken) {
        // check existence and return immediately
        var existingConversation = await conversationRepository
            .AsQueryable()
            .Where(c => c.Type == ConversationType.Direct && c.Participants.Count == 2)
            .Where(c => 
                c.Participants.Any(p => p.UserId == user1Id) && 
                c.Participants.Any(p => p.UserId == user2Id)
            )
            .FirstOrDefaultAsync(cancellationToken);

        if (existingConversation != null) {
            return Result<Conversation>.Success(existingConversation);
        }
        
        // check for having accepted friend request before creating conversation
        Guid? friendRequestId = await friendRequestRepository
            .AsQueryable()
            .Where(fr => 
                fr.Status == FriendRequestStatus.Accepted && (
                    fr.SenderUserId == user1Id && fr.ReceiverUserId == user2Id ||
                    fr.SenderUserId == user2Id && fr.ReceiverUserId == user1Id
                )
            )
            .Select(fr => fr.Id)
            .Cast<Guid?>()
            .FirstOrDefaultAsync(cancellationToken);

        if (friendRequestId == null) {
            return Errors.NoAcceptedFriendRequest();
        }
        
        Conversation conversation = new() {
            Id = Guid.NewGuid(),
            Type = ConversationType.Direct,
            Participants = [
                new() { UserId = user1Id },
                new() { UserId = user2Id },
            ],
            FriendRequestId = friendRequestId.Value,
        };

        conversationRepository.Add(conversation);
        
        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<Conversation>.Success(conversation);
        } catch (DbUpdateException) {
            // Catch concurrency race conditions
            
            return Result<Conversation>.Success(await conversationRepository
                .AsQueryable()
                .Where(c => c.Type == ConversationType.Direct)
                .Where(c => 
                    c.Participants.Any(p => p.UserId == user1Id) && 
                    c.Participants.Any(p => p.UserId == user2Id)
                )
                .FirstAsync(cancellationToken));
        }
    }
}