using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record BulkDeleteEmojiCommand(
    Guid ServerId, 
    List<Guid> EmojiIds
) : ICommand<Result<int>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [
        ServerPermission.ManageEmojis, 
        ServerPermission.DeleteEmoji,
    ];
}

public sealed record EmojiDeletedNotification(Guid ServerId, List<Guid> EmojiIds) : INotification;

public sealed class BulkDeleteEmojiHandler(
    IEmojiWriteRepository emojiWriteRepository,
    IPublisher publisher,
    IEmojiMediaService mediaService,
    IServerEmojiCacheProvider cacheProvider,
    ILogger<BulkDeleteEmojiHandler> logger
) : ICommandHandler<BulkDeleteEmojiCommand, Result<int>> {
    public async ValueTask<Result<int>> Handle(BulkDeleteEmojiCommand command, CancellationToken cancellationToken) {
        var serverId = command.ServerId;
        var emojiIds = command.EmojiIds;
        
        int deletedCount = await emojiWriteRepository
            .AsQueryable()
            .Where(e => e.ServerId == serverId && emojiIds.Contains(e.Id))
            .ExecuteDeleteAsync(cancellationToken);

        // unrecoverable procedure...
        if (deletedCount > 0) {
            await cacheProvider.Remove(serverId);
            
            try {
                Result result = await mediaService.Delete(emojiIds, CancellationToken.None);
                
                if (!result.IsSuccess) {
                    logger.LogError("Failed to delete emoji media for emojis [{id}].", string.Join(", ", emojiIds));
                }
            } catch (Exception e) {
                logger.LogError(e, "Failed to delete emoji media for emojis [{id}].", string.Join(", ", emojiIds));
                return Errors.UnexpectedError();
            }
            
            await publisher.Publish(new EmojiDeletedNotification(serverId, emojiIds), CancellationToken.None);
        }
        
        return Result<int>.Success(deletedCount);
    }
}