using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record DeleteEmojiCommand(
    Guid ServerId, 
    Guid EmojiId
) : ICommand<Result>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.DeleteEmoji];
}

public sealed record EmojiDeletedNotification(Guid ServerId, Guid EmojiId) : INotification;

public sealed partial class DeleteEmojiHandler(
    IEmojiWriteRepository emojiWriteRepository,
    IEmojiMediaService mediaService,
    IServerEmojiCacheProvider cacheProvider,
    IPublisher publisher,
    ILogger<DeleteEmojiHandler> logger
) : ICommandHandler<DeleteEmojiCommand, Result> {
    public async ValueTask<Result> Handle(DeleteEmojiCommand command, CancellationToken cancellationToken) {
        var serverId = command.ServerId;
        var emojiId = command.EmojiId;
        
        int count = await emojiWriteRepository
            .AsQueryable()
            .Where(e => e.ServerId == serverId && e.Id == emojiId)
            .ExecuteDeleteAsync(cancellationToken);

        if (count == 1) {
            await cacheProvider.Remove(serverId);
            
            try {
                Result result = await mediaService.Delete(emojiId, CancellationToken.None);
                
                if (!result.IsSuccess) {
                    logger.LogError("Failed to delete emoji media for emoji {id}.", emojiId);
                }
            } catch (Exception e) {
                LogMediaDeletionFailure(logger, emojiId, e);
                return Errors.UnexpectedError();
            }
            
            await publisher.Publish(new EmojiDeletedNotification(serverId, emojiId), CancellationToken.None);
            return Result.Success();
        }

        return Errors.ResourceNotFound("Emoji", [
            new(nameof(Emoji.ServerId), serverId.ToString()),
            new(nameof(Emoji.Id), emojiId.ToString()),
        ]);
    }
    
    [LoggerMessage(LogLevel.Critical, "Failed to delete emoji on media storage for emoji {id}.")]
    private static partial void LogMediaDeletionFailure(ILogger logger, Guid id, Exception exception);
}