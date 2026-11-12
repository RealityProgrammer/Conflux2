using Conflux.Application.Dto;
using Conflux.Application.Options;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Humanizer;
using Markdig;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace Conflux.Application.Features.Conversation;

public sealed record SendMessageCommand(
    Guid ConversationId,
    string? Body,
    IReadOnlyList<UploadFile> Attachments,
    Guid? ReplyToId
) : ICommand<Result<TimelineMessageDto>>, IConversationCommand;

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class SendMessageCommandValidator : AbstractValidator<SendMessageCommand> {
    public SendMessageCommandValidator(IOptions<MediaOptions> mediaOptions) {
        var options = mediaOptions.Value;
        
        RuleFor(c => c.Body)
            .MaximumLength(4000)
            .WithMessage(ValidationMessages.StringMaxLength);

        RuleFor(c => c.Attachments)
            .Must(attachments => attachments.Count <= 4)
            .WithMessage(string.Format(ValidationMessages.MessageMaximumAttachmentsCount, 4));

        RuleForEach(c => c.Attachments)
            .Must(attachment => attachment.Stream.Length <= options.MaxMessageAttachmentSize)
            .WithMessage($"Attachment {{CollectionIndex}} is larger than allowed size, maximum is {options.MaxMessageAttachmentSize.Bytes().Megabytes}MB ({options.MaxMessageAttachmentSize} bytes).");
    }
}

public sealed record MessageReceivedNotification(
    Guid ConversationId, 
    TimelineMessageDto Message
) : INotification;

public sealed record MentioningNotification(
    MentionMessageSource Source,
    IReadOnlySet<Guid> MentioningUserIds
) : INotification;

public sealed partial class SendMessageHandler(
    ICurrentUserService currentUserService,
    IUserRepository userRepository,
    IMessageRepository messageRepository,
    IConversationRepository conversationRepository,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IConversationAuthorizeService conversationAuthorizeService,
    IEmojiReadRepository emojiReadRepository,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    TimeProvider timeProvider,
    IMessageMediaService messageMediaService,
    ILogger<SendMessageHandler> logger
) : ICommandHandler<SendMessageCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(SendMessageCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } senderUserId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid conversationId = command.ConversationId;
        
        Domain.Entities.Conversation? conversation = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .FirstOrDefaultAsync(cancellationToken);

        if (conversation == null) {
            return Errors.ResourceNotFound("Conversation", [new("Id", conversationId.ToString())]);
        }

        if (!await conversationAuthorizeService.CanSendMessage(senderUserId, conversationId, cancellationToken)) {
            return Errors.Forbidden("You are not allowed to send message in this conversation.");
        }

        // parse the Markdown document here since we going to use it for both validation and extract mentioning.
        MarkdownDocument? markdownDocument = null;

        if (!string.IsNullOrWhiteSpace(command.Body)) {
            markdownDocument = Markdown.Parse(command.Body);
            
            // ensure that user is allowed to use the emoji (user is member of the server contains the emoji).
            var error = await TryValidateEmoji(markdownDocument, senderUserId, cancellationToken);
            if (error != Error.None) {
                return error;
            }
        }

        var utcNow = timeProvider.GetUtcNow();

        // create and update
        Message message = new() {
            Body = command.Body,
            SenderUserId = senderUserId,
            Conversation = conversation,
            ReplyToId = command.ReplyToId,
        };
        
        messageRepository.Add(message);
        conversation.LatestMessageAt = utcNow;
        
        // upload attachments
        var uploadResults = await messageMediaService.UploadAttachments(command.Attachments, cancellationToken);

        if (!uploadResults.IsSuccess) {
            return uploadResults.Error;
        }

        AttachmentUploadResult[] attachmentUploadResults = uploadResults.Value!;

        // add MediaItem objects
        message.Attachments = attachmentUploadResults.Length == 0 ? Array.Empty<MediaItem>() : new List<MediaItem>();

        for (int i = 0; i < attachmentUploadResults.Length; i++) {
            message.Attachments.Add(new() {
                Id = attachmentUploadResults[i].Id,
                Type = MediaItemType.MessageAttachment,
                FileName = attachmentUploadResults[i].FileName,
                ContentType = attachmentUploadResults[i].Format.MediaType,
                Version = 0,
                Order = (short)i,
            });
        }
        
        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            await messageMediaService.DeleteAttachments([..attachmentUploadResults.Select(a => a.Id)], cancellationToken);
            throw;
        } catch (Exception e) {
            await messageMediaService.DeleteAttachments([..attachmentUploadResults.Select(a => a.Id)], cancellationToken);
            logger.LogError(e, "Exception thrown while saving message to database.");
            return Errors.OperationFailure("send message.");
        }

        // publish message received notification
        TimelineMessageDto dto = new(message) {
            ReplyTo = await messageRepository
                .AsQueryable()
                .Where(m => m.Id == message.ReplyToId)
                .SelectFacet<TimelineMessageReplyDto>()
                .SingleOrDefaultAsync(CancellationToken.None),
            
            Sender = await userRepository
                .AsQueryable()
                .Where(u => u.Id == message.SenderUserId)
                .SelectFacet<TimelineMessageSenderDto>()
                .FirstOrDefaultAsync(CancellationToken.None),
        };

        await publisher.Publish(
            new MessageReceivedNotification(conversationId, dto), 
            CancellationToken.None
        );
        
        // publish mentioning notification
        // check regex isMatch to quickly discard any message that doesn't have any mentioning token
        if (markdownDocument != null && MentionUserRegex.IsMatch(message.Body!)) {
            await PublishMentionNotification(
                conversation.Type,
                conversationId, 
                message.Id, 
                markdownDocument,
                senderUserId
            );
        }
        
        // update direct conversation
        if (conversation.Type == ConversationType.Direct) {
            IReadOnlyCollection<Guid> directConversationParticipantIds = 
                await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversationId, CancellationToken.None);
            
            await publisher.Publish(
                new DirectConversationUpdatedNotification(conversationId, directConversationParticipantIds), 
                CancellationToken.None
            );
        }

        return Result<TimelineMessageDto>.Success(dto);
    }

    private async Task<Error> TryValidateEmoji(MarkdownDocument markdownDocument, Guid senderUserId, CancellationToken cancellationToken) {
        // extract emoji ids first.
        var emojiIds = new HashSet<Guid>();

        foreach (Block block in markdownDocument) {
            TraverseObject(block, emojiIds);
        }

        if (emojiIds.Count == 0) {
            return Error.None;
        }
        
        // extract server ids from emoji and check if user is member of that server
        var validEmojiCount = await emojiReadRepository
            .AsQueryable()
            .Where(e => emojiIds.Contains(e.Id) && e.Server.Members.Any(m => m.UserId == senderUserId && m.Status == MembershipStatus.Active))
            .CountAsync(cancellationToken);

        return validEmojiCount != emojiIds.Count ? 
            Errors.Forbidden("You do not have permission to use one or more emojis in this message.") : 
            Error.None;

        static void TraverseObject(MarkdownObject markdownObject, HashSet<Guid> emojiIds) {
            while (true) {
                // skip these blocks
                if (markdownObject is CodeBlock or FencedCodeBlock or CodeInline) {
                    return;
                }

                switch (markdownObject) {
                    case ContainerBlock containerBlock:
                        foreach (var children in containerBlock) {
                            TraverseObject(children, emojiIds);
                        }
                        break;

                    case LeafBlock leafBlock:
                        if (leafBlock.Inline is { } inline) {
                            markdownObject = inline;
                            continue;
                        }
                        break;

                    case ContainerInline containerInline:
                        foreach (var children in containerInline) {
                            TraverseObject(children, emojiIds);
                        }
                        break;

                    case LiteralInline literalInline:
                        var text = literalInline.Content.AsSpan();

                        foreach (var match in EmojiRegex.EnumerateMatches(text)) {
                            ReadOnlySpan<char> slice = text.Slice(match.Index + 2, match.Length - 3);

                            if (Guid.TryParse(slice, out Guid emojiId)) {
                                emojiIds.Add(emojiId);
                            }
                        }
                        break;
                }
                break;
            }
        }
    }
    
    private async Task PublishMentionNotification(
        ConversationType conversationType, 
        Guid conversationId, 
        Guid messageId,
        MarkdownDocument markdownDocument,
        Guid messageSenderId
    ) {
        var userIds = new HashSet<Guid>();

        foreach (Block block in markdownDocument) {
            TraverseObject(block, userIds);
        }

        userIds.Remove(messageSenderId);   // prevent self-pinging

        if (userIds.Count > 0) {
            MentionMessageSource? mentionSource;
            HashSet<Guid>? filteredUserIds;
            
            // get mentioning source and remove all unmentionable users:
            // - for non-server, only allow participants
            // - for server, only allow user members

            switch (conversationType) {
                case ConversationType.Direct:
                    mentionSource = new(new MentionFromDm(conversationId, messageSenderId), messageId);
                    filteredUserIds = await conversationRepository
                        .AsQueryable()
                        .Where(c => c.Id == conversationId)
                        .SelectMany(c => c.Participants.Select(p => p.User))
                        .Where(u => userIds.Contains(u.Id))
                        .Select(u => u.Id)
                        .ToHashSetAsync();
                    break;
                
                case ConversationType.Server:
                    var channelIds = await conversationRepository
                        .AsQueryable()
                        .Where(c => c.Id == conversationId)
                        .Include(c => c.Channel)
                        .Select(c => new {
                            c.Channel!.Id,
                            c.Channel.CommunityServerId,
                        })
                        .SingleAsync();

                    mentionSource = new(new MentionFromServer(conversationId, channelIds.CommunityServerId, channelIds.Id), messageId);
                    filteredUserIds = await conversationRepository
                        .AsQueryable()
                        .Where(c => c.Id == conversationId)
                        .SelectMany(c => c.Channel!.CommunityServer.Members.Select(m => m.User))
                        .Where(u => userIds.Contains(u.Id))
                        .Select(u => u.Id)
                        .ToHashSetAsync();
                    break;
                
                default:
                    mentionSource = null;
                    filteredUserIds = null;
                    break;
            }

            if (filteredUserIds is { Count: > 0 } && mentionSource != null) {
                await publisher.Publish(new MentioningNotification(
                    mentionSource,
                    filteredUserIds
                ));
            }
        }
        
        return;

        static void TraverseObject(MarkdownObject markdownObject, HashSet<Guid> userIds) {
            while (true) {
                // skip these blocks
                if (markdownObject is CodeBlock or FencedCodeBlock or CodeInline or QuoteBlock) {
                    return;
                }

                switch (markdownObject) {
                    case ContainerBlock containerBlock:
                        foreach (var children in containerBlock) {
                            TraverseObject(children, userIds);
                        }
                        break;

                    case LeafBlock leafBlock:
                        if (leafBlock.Inline is { } inline) {
                            markdownObject = inline;
                            continue;
                        }
                        break;

                    case ContainerInline containerInline:
                        foreach (var children in containerInline) {
                            TraverseObject(children, userIds);
                        }
                        break;

                    case LiteralInline literalInline:
                        var text = literalInline.Content.AsSpan();

                        foreach (var match in MentionUserRegex.EnumerateMatches(text)) {
                            ReadOnlySpan<char> userIdSlice = text.Slice(match.Index + 2, match.Length - 3);

                            if (Guid.TryParse(userIdSlice, out Guid userId)) {
                                userIds.Add(userId);
                            }
                        }
                        break;
                }
                break;
            }
        }
    }

    [GeneratedRegex(@":m([\da-f\-]+):", RegexOptions.Compiled)]
    private static partial Regex MentionUserRegex { get; }
    
    [GeneratedRegex(@":e([\da-f\-]+):", RegexOptions.Compiled)]
    private static partial Regex EmojiRegex { get; }
}
