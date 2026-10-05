using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record GetDirectConversationSummaryCommand(
    Guid UserId, 
    Guid PeerId
) : ICommand<Result<DirectConversationSummary>>;

internal sealed class GetDirectConversationSummaryHandler(
    IDirectConversationProvider directConversationProvider,
    IUserRepository userRepository
) : ICommandHandler<GetDirectConversationSummaryCommand, Result<DirectConversationSummary>> {
    public async ValueTask<Result<DirectConversationSummary>> Handle(
        GetDirectConversationSummaryCommand command, 
        CancellationToken cancellationToken
    ) {
        Result<Domain.Entities.Conversation> conversationResult = 
            await directConversationProvider.GetOrCreate(command.UserId, command.PeerId, cancellationToken);

        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }

        var peerDto = await userRepository
            .AsQueryable()
            .Where(u => u.Id == command.PeerId)
            .SelectFacet<UserIdentityProfileDto>()
            .FirstOrDefaultAsync(cancellationToken);

        if (peerDto == null) {
            return Errors.ResourceNotFound("User", [
                new(nameof(ApplicationUser.Id), command.PeerId.ToString()),
            ]);
        }

        return Result<DirectConversationSummary>.Success(new(conversationResult.Value!.Id, peerDto));
    }
}