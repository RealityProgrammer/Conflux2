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
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;
using TimelineMessageDto = Conflux.Domain.Dto.TimelineMessageDto;

namespace Conflux.WebApi.Controllers.Conversation;

[ApiController]
[Route("api/conversations")]
[Authorize]
public sealed class ConversationController(
    IMediator mediator
) : ControllerBase {
    [HttpPost("{conversationId:guid}/messages")]
    [Idempotent(20)]
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
        
                    return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<TimelineMessageDto>(null, Errors.OperationFailure("open attachment stream")));
                }
            }
        } else {
            attachments = [];
        }

        try {
            var result = await mediator.Send(new SendMessageCommand(
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

    [HttpPatch("{conversationId:guid}/messages/{messageId:guid}")]
    public async Task<ActionResult<ApiResponse>> EditMessage(
        Guid conversationId,
        Guid messageId,
        [FromForm] PatchMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var result = await mediator.Send(new EditMessageCommand(conversationId, messageId, request.Body), cancellationToken);

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

    [HttpDelete("{conversationId:guid}/messages/{messageId:guid}")]
    public async Task<ActionResult> DeleteMessage(Guid conversationId, Guid messageId) {
        Result result = await mediator.Send(new DeleteMessageCommand(conversationId, messageId));

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

    [HttpPost("{conversationId:guid}/messages/read")]
    public async Task<ActionResult<ApiResponse<TimelineMessagePage>>> GetMessages(
        Guid conversationId,
        [FromBody] ReadMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var result = await mediator.Send(
            new ReadTimelineMessagesQuery(conversationId, request.ReadStrategy, 50), 
            cancellationToken
        );

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessagePage>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse<TimelineMessagePage>(null, result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse<TimelineMessagePage>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<TimelineMessagePage>(null, result.Error)),
        };
    }

    [HttpPost("{conversationId:guid}/messages/{messageId:guid}/pin")]
    [Idempotent(15)]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> PinMessage(
        Guid conversationId,
        Guid messageId
    ) {
        var result = await mediator.Send(new PinMessageCommand(conversationId, messageId));

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
    
    [HttpPost("{conversationId:guid}/messages/{messageId:guid}/unpin")]
    [Idempotent(15)]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> UnpinMessage(
        Guid conversationId,
        Guid messageId
    ) {
        var result = await mediator.Send(new UnpinMessageCommand(conversationId, messageId));

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

    public record SendMessageRequest(
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

    public record ReadMessageRequest(
        [Required] MessageReadStrategy ReadStrategy
    );
    
    public record PatchMessageRequest(
        [StringLength(1024, ErrorMessage = "Message body can only have maximum length of 1024 characters.")]
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
}
