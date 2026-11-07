using Conflux.Application.Dto;
using Conflux.Application.Features.Conversation;
using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.WebApi.Attributes;
using Humanizer;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Conversation;

[ApiController, Route("api/conversations/{conversationId:guid}/messages"), Authorize]
public sealed class ConversationMessagesController(
    ISender sender
) : ControllerBase {
    [HttpPost, Idempotent(30), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> SendMessage(
        Guid conversationId,
        [FromForm] SendMessageRequest request,
        CancellationToken cancellationToken
    ) {
        if (request.Body.AsSpan().Trim().IsEmpty && request.Attachments is not { Length: > 0 }) {
            return BadRequest(new ApiResponse(Errors.EmptyMessageContent()));
        }
        
        UploadFile[] attachments;
        
        if (request.Attachments is { Length: > 0 }) {
            attachments = new UploadFile[request.Attachments.Length];
            
            for (int i = 0; i < attachments.Length; i++) {
                try {
                    attachments[i] = new(request.Attachments[i].FileName, request.Attachments[i].OpenReadStream());
                } catch {
                    foreach (var attachment in attachments) {
                        if (attachment.Stream != null!) {
                            await attachment.Stream.DisposeAsync();
                        }
                    }
        
                    return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.OperationFailure("open attachment stream")));
                }
            }
        } else {
            attachments = [];
        }

        try {
            var result = await sender.Send(new SendMessageCommand(
                conversationId, 
                request.Body, 
                attachments, 
                request.ReplyToId
            ), cancellationToken);

            if (result.IsSuccess) {
                return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
            }
        
            return result.Error.Code switch {
                nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
                nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
                nameof(Errors.Forbidden) => NotFound(new ApiResponse(Errors.ResourceNotFound("Conversation"))),
                nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
                nameof(Errors.AttachmentUploadFailure) => StatusCode(StatusCodes.Status502BadGateway, new ApiResponse(result.Error)),
                _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.UnexpectedError())),
            };
        } finally {
            foreach (var stream in attachments) {
                await stream.Stream.DisposeAsync();
            }
        }
    }

    [HttpPatch("{messageId:guid}"), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse>> EditMessage(
        Guid conversationId,
        Guid messageId,
        [FromForm] PatchMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var result = await sender.Send(new EditMessageCommand(conversationId, messageId, request.Body), cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpDelete("{messageId:guid}"), ValidateAntiForgeryToken]
    public async Task<ActionResult> DeleteMessage(Guid conversationId, Guid messageId) {
        Result result = await sender.Send(new DeleteMessageCommand(conversationId, messageId));

        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("read")]
    public async Task<ActionResult<ApiResponse<TimelineMessagePage>>> GetMessages(
        Guid conversationId,
        [FromBody] ReadMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var result = await sender.Send(
            new ReadTimelineMessagesQuery(conversationId, request.ReadStrategy, 50), 
            cancellationToken
        );

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessagePage>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("search")]
    public async Task<ActionResult<ApiResponse<MessageSearchPage>>> SearchMessage(
        Guid conversationId,
        [FromBody] SearchMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var result = await sender.Send(new SearchMessage(conversationId, request.Content, request.SenderIds, request.StartDateTime, request.EndDateTime), cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<MessageSearchPage>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{messageId:guid}/pin"), Idempotent(5), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> PinMessage(
        Guid conversationId,
        Guid messageId
    ) {
        var result = await sender.Send(new PinMessageCommand(conversationId, messageId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("{messageId:guid}/unpin"), Idempotent(5), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> UnpinMessage(
        Guid conversationId,
        Guid messageId
    ) {
        var result = await sender.Send(new UnpinMessageCommand(conversationId, messageId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record SendMessageRequest(
        [StringLength(4000, ErrorMessage = "Message body can only have maximum length of 1024 characters.")]
        string? Body,

        [MaxLength(4, ErrorMessage = "Only 4 attachments allowed in a message.")]
        IFormFile[]? Attachments,
        
        Guid? ReplyToId
    ) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
            var results = new List<ValidationResult>();

            Validator.TryValidateProperty(Body, new(this, null, null) {
                MemberName = nameof(Body),
            }, results);

            Validator.TryValidateProperty(Attachments, new(this, null, null) {
                MemberName = nameof(Attachments),
            }, results);

            foreach (var result in results) {
                yield return result;
            }

            if (Attachments is { Length: > 0 }) {
                var options = validationContext.GetRequiredService<IOptions<MediaOptions>>().Value;

                if (Attachments.Length > 4) {
                    yield return new("Only 4 attachments allowed in a message.", [
                        nameof(Attachments),
                    ]);
                }

                foreach (var attachment in Attachments) {
                    if (attachment.Length > options.MaxMessageAttachmentSize) {
                        yield return new($"Attachment must be smaller than {options.MaxMessageAttachmentSize.Bytes():MB}.", [
                            nameof(Attachments),
                        ]);
                    }
                }
            }
        }
    }

    public sealed record ReadMessageRequest(
        [Required] MessageReadStrategy ReadStrategy
    );
    
    public sealed record PatchMessageRequest(
        [StringLength(4000, ErrorMessage = "Message body can only have maximum length of 4000 characters.")]
        string? Body
    ) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
            var results = new List<ValidationResult>();

            Validator.TryValidateProperty(Body, new(this, null, null) {
                MemberName = nameof(Body),
            }, results);

            return results;
        }
    }

    public sealed record SearchMessageRequest(
        string? Content,
		IReadOnlyCollection<Guid>? SenderIds,
		DateTimeOffset? StartDateTime,
		DateTimeOffset? EndDateTime
    );
}
