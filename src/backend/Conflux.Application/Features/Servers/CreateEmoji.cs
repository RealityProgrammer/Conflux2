using Conflux.Application.Dto;
using Conflux.Application.Options;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Humanizer;
using Microsoft.Extensions.Options;
using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace Conflux.Application.Features.Servers;

public sealed record CreateEmojiCommand(
    Guid ServerId,
    string ShortCode,
    Stream Image
) : ICommand<Result<EmojiDto>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.ManageEmojis, ServerPermission.CreateEmoji];
}

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed partial class CreateEmojiCommandValidator : AbstractValidator<CreateEmojiCommand> {
    public CreateEmojiCommandValidator(IOptions<MediaOptions> mediaOptions) {
        var options = mediaOptions.Value;
        
        RuleFor(command => command.ShortCode)
            .NotNull()
            .NotEmpty()
            .WithMessage(ValidationMessages.PropertyRequired)
            .Matches(ShortCodeRegex())
            .WithMessage("{PropertyName} can only contain letters, numbers, dashes, and underscores.")
            .MaximumLength(48)
            .WithMessage(ValidationMessages.StringMaxLength);

        RuleFor(command => command.Image)
            .NotNull()
            .WithMessage(ValidationMessages.PropertyRequired)
            .Must(stream => {
                if (stream.CanSeek) {
                    return stream.Length <= options.MaxEmojiSize;
                }

                return true;
            })
            .WithMessage($"{{PropertyName}} cannot exceed {options.MaxEmojiSize.Bytes().Kilobytes}KB.");
    }
    
    [GeneratedRegex(@"^[\w\-]+$", RegexOptions.None | RegexOptions.ECMAScript, matchTimeoutMilliseconds: 1000)]
    private static partial Regex ShortCodeRegex();
}

public sealed record EmojiCreatedNotification(Guid ServerId, EmojiDto Emoji) : INotification;

public sealed partial class CreateEmojiHandler(
    ICurrentUserService currentUserService,
    IPublisher publisher,
    IEmojiWriteRepository emojiWriteRepository,
    ICommunityServerReadRepository communityServerReadRepository,
    IEmojiRepository emojiRepository,
    IUnitOfWork unitOfWork,
    IEmojiMediaService mediaService,
    IServerEmojiCacheService cacheService,
    ILogger<CreateEmojiHandler> logger
) : ICommandHandler<CreateEmojiCommand, Result<EmojiDto>> {
    private const int MaxEmojiCount = 50;
    
    public async ValueTask<Result<EmojiDto>> Handle(CreateEmojiCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid serverId = command.ServerId;

        if (!await communityServerReadRepository.Exists(serverId, cancellationToken)) {
            return Errors.ResourceNotFound("Community Server", [
                new(nameof(CommunityServer.Id), serverId.ToString()),
            ]);
        }
        
        int emojiCount = await emojiRepository.CountByServerId(serverId, cancellationToken);
        if (emojiCount >= MaxEmojiCount) {
            return Errors.ServerEmojiLimit();
        }

        Emoji emoji = new() {
            ServerId = serverId,
            ShortCode = command.ShortCode,
            CreatorId = userId,
        };
        
        emojiWriteRepository.Add(emoji);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            // TODO: Handle TOCTOU race condition
            logger.LogError(e, "Exception thrown while creating emoji.");
            return Errors.UnexpectedError();
        }
        
        // upload the avatar picture
        Result uploadResult;
        try {
            uploadResult = await mediaService.Upload(emoji.Id, command.Image, cancellationToken);
        } catch (OperationCanceledException) {
            await RollbackDatabase();
            throw;
        } catch (Exception e) {
            await RollbackDatabase();
            
            logger.LogError(e, "Exception thrown while uploading image for emoji {emojiId}.", emoji.Id);
            return Errors.OperationFailure("create emoji");
        }

        if (!uploadResult.IsSuccess) {
            await RollbackDatabase();
            return uploadResult.Error;
        }
        
        await cacheService.Remove(serverId);

        EmojiDto dto = new(emoji);
        await publisher.Publish(new EmojiCreatedNotification(serverId, dto), CancellationToken.None);
        
        return Result<EmojiDto>.Success(dto);

        async Task RollbackDatabase() {
            emojiWriteRepository.Remove(emoji);
            
            try {
                await unitOfWork.SaveChangesAsync(CancellationToken.None);
            } catch (Exception e) {
                LogDatabaseRollbackFailure(logger, emoji.Id, e);
            }
        }
    }
    
    [LoggerMessage(LogLevel.Critical, "Failed to rollback emoji database record {EmojiId} after image upload failure.")]
    private static partial void LogDatabaseRollbackFailure(ILogger logger, Guid emojiId, Exception exception);
}