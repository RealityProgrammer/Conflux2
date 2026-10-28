using Conflux.Application.Features;
using Conflux.Application.Services;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Pipelines;

internal sealed class EnsureConversationParticipantBehavior<TRequest, TResponse>(
    ICurrentUserService currentUserService,
    IConversationParticipantRepository conversationParticipantRepository,
    IUnitOfWork unitOfWork
) : IPipelineBehavior<TRequest, TResponse> where TRequest : IConversationCommand {
    public async ValueTask<TResponse> Handle(
        TRequest message, 
        MessageHandlerDelegate<TRequest, TResponse> next, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return await next(message, cancellationToken);
        }
        
        var exists = await conversationParticipantRepository
            .AsQueryable()
            // HANK!!!
            .AnyAsync(cp => cp.UserId == userId && cp.ConversationId == message.ConversationId, cancellationToken);
        
        if (!exists)
        {
            conversationParticipantRepository.Add(new() {
                UserId = userId,
                ConversationId = message.ConversationId,
            });
            
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return await next(message, cancellationToken);
    }
}