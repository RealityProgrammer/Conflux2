using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record DeleteEmojiCommand(Guid ServerId, Guid EmojiId) : ICommand<Result>;

public sealed record EmojiDeletedNotification(Guid ServerId, Guid EmojiId) : INotification;

public sealed partial class DeleteEmojiHandler(
    IEmojiWriteRepository emojiWriteRepository,
    IEmojiMediaService mediaService,
    IPublisher publisher,
    ILogger<DeleteEmojiHandler> logger
) : ICommandHandler<DeleteEmojiCommand, Result> {
    public async ValueTask<Result> Handle(DeleteEmojiCommand command, CancellationToken cancellationToken) {
        int count = await emojiWriteRepository
            .AsQueryable()
            .Where(e => e.ServerId == command.ServerId && e.Id == command.EmojiId)
            .ExecuteDeleteAsync(cancellationToken);

        if (count == 1) {
            try {
                Result result = await mediaService.Delete(command.EmojiId, CancellationToken.None);
                
                if (!result.IsSuccess) {
                    logger.LogError("Failed to delete emoji media for emoji {id}.", command.EmojiId);
                }
            } catch (Exception e) {
                LogMediaDeletionFailure(logger, command.EmojiId, e);
                return Errors.UnexpectedError();
            }
            
            await publisher.Publish(new EmojiDeletedNotification(command.ServerId, command.EmojiId), CancellationToken.None);
            return Result.Success();
        }

        return Errors.ResourceNotFound("Emoji", [
            new(nameof(Emoji.ServerId), command.ServerId.ToString()),
            new(nameof(Emoji.Id), command.EmojiId.ToString()),
        ]);
    }
    
    [LoggerMessage(LogLevel.Critical, "Failed to delete emoji on media storage for emoji {id}.")]
    private static partial void LogMediaDeletionFailure(ILogger logger, Guid id, Exception exception);
}