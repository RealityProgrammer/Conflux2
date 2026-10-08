using Conflux.Application.Dto;
using Conflux.Application.Features.Conversation;
using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Humanizer;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;
using TimelineMessageDto = Conflux.Domain.Dto.TimelineMessageDto;

namespace Conflux.WebApi.Controllers;

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
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

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
                userId, 
                conversationId, 
                request.Body, 
                attachments, 
                request.ReplyToId
            ), cancellationToken);

            if (result.IsSuccess) {
                return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
            }
        
            return result.Error.Code switch {
                nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse<TimelineMessageDto>(null, result.Error)),
                nameof(Errors.AttachmentUploadFailure) => StatusCode(StatusCodes.Status502BadGateway, new ApiResponse<TimelineMessageDto>(null, result.Error)),
                _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<TimelineMessageDto>(null, Errors.UnexpectedError())),
            };
        } finally {
            foreach (var stream in attachments) {
                await stream.Stream.DisposeAsync();
            }
        }
    }

    [HttpPatch("{conversationId:guid}/messages/{messageId:guid}")]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> EditMessage(
        Guid conversationId,
        Guid messageId,
        [FromForm] PatchMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<TimelineMessageDto>(null, Errors.InvalidIdentifier()));
        }

        var result = await mediator.Send(new EditMessageCommand(conversationId, userId, messageId, request.Body), cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse<TimelineMessageDto>(null, result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse<TimelineMessageDto>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<TimelineMessageDto>(null, result.Error)),
        };
    }

    [HttpDelete("{conversationId:guid}/messages/{messageId:guid}")]
    public async Task<ActionResult> DeleteMessage(Guid conversationId, Guid messageId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await mediator.Send(new DeleteMessageCommand(conversationId, userId, messageId));

        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
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
        await Task.Delay(3000, cancellationToken);
        
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await mediator.Send(new ReadTimelineMessagesQuery(
            userId, conversationId, request.ReadStrategy, 50
        ), cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessagePage>(result.Value, Error.None));
        }

        return result.Error.Code switch {
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
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new PinMessageCommand(userId, conversationId, messageId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
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
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new UnpinMessageCommand(userId, conversationId, messageId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
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
                var configuration = validationContext.GetService<IConfiguration>()!;
                var options = configuration.GetSection("Services:User").Get<MessagingServiceOptions>()!;

                if (Attachments.Length > 4) {
                    yield return new("Only 4 attachments allowed in a message.", [
                        nameof(Attachments),
                    ]);
                }

                foreach (var attachment in Attachments) {
                    if (attachment.Length > options.MaxAttachmentSizeBytes) {
                        yield return new($"Attachment must be smaller than {options.MaxAttachmentSizeBytes.Bytes():MB}.", [
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
