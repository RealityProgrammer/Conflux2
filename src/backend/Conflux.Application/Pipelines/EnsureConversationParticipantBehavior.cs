using Conflux.Application.Features;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Pipelines;

internal sealed class EnsureConversationParticipantBehavior<TRequest, TResponse>(
    ICurrentUserService currentUserService,
    IConversationRepository conversationRepository,
    IConversationParticipantRepository conversationParticipantRepository,
    IUnitOfWork unitOfWork
) : IPipelineBehavior<TRequest, TResponse> where TRequest : IConversationCommand where TResponse : IResult<TResponse> {
    public async ValueTask<TResponse> Handle(
        TRequest message, 
        MessageHandlerDelegate<TRequest, TResponse> next, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return await next(message, cancellationToken);
        }
        
        var conversationExists = await conversationRepository
            .AsQueryable()
            .AnyAsync(c => c.Id == message.ConversationId, cancellationToken);

        if (!conversationExists) {
            return TResponse.Failure(Errors.ResourceNotFound("Conversation", [
                new(nameof(Conversation.Id), message.ConversationId.ToString()),
            ]));
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