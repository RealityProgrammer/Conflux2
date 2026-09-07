using Conflux.Application.Dto;
using Conflux.Application.Features.Messages;
using Conflux.Application.Options;
using Conflux.Application.Services;
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
[Route("api")]
[Authorize]
public sealed class ConversationController(
    IMediator mediator,
    IBlobUrlProvider blobUrlProvider
) : ControllerBase {
    [HttpPost("channels/{channelId:guid}/messages")]
    [Idempotent(20)]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> SendMessage(
        Guid channelId,
        [FromForm] SendMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<TimelineMessageDto>(null, Errors.InvalidIdentifier()));
        }

        if (request.Body.AsSpan().Trim().IsEmpty && request.Attachments is not { Length: > 0 }) {
            return BadRequest(new ApiResponse<TimelineMessageDto>(null, Errors.EmptyMessageContent()));
        }

        Stream[] attachmentStreams;

        if (request.Attachments is { Length: > 0 }) {
            attachmentStreams = new Stream[request.Attachments.Length];
            
            for (int i = 0; i < attachmentStreams.Length; i++) {
                try {
                    attachmentStreams[i] = request.Attachments[i].OpenReadStream();
                } catch {
                    foreach (var stream in attachmentStreams) {
                        if (stream != null!) {
                            await stream.DisposeAsync();
                        }
                    }

                    return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<TimelineMessageDto>(null, Errors.OperationFailure("open attachment stream")));
                }
            }
        } else {
            attachmentStreams = [];
        }

        try {
            var result = await mediator.Send(new SendMessageCommand(
                userId, 
                channelId, 
                request.Body, 
                attachmentStreams, 
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
            foreach (var stream in attachmentStreams) {
                await stream.DisposeAsync();
            }
        }
    }

    [HttpPatch("messages/{messageId:guid}")]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> EditMessage(
        Guid messageId,
        [FromForm] PatchMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<TimelineMessageDto>(null, Errors.InvalidIdentifier()));
        }

        var result = await mediator.Send(new EditMessageCommand(userId, messageId, request.Body), cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse<TimelineMessageDto>(null, result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse<TimelineMessageDto>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<TimelineMessageDto>(null, result.Error)),
        };
    }

    [HttpDelete("messages/{messageId:guid}")]
    public async Task<ActionResult> DeleteMessage(Guid messageId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await mediator.Send(new DeleteMessageCommand(userId, messageId));

        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("channels/{channelId:guid}/messages")]
    public async Task<ActionResult<ApiResponse<GetMessagesResponse>>> GetTimelineMessages(
        Guid channelId,
        [FromQuery] MessageLoadDirection? direction,
        [FromQuery] Guid? cursor,
        [FromQuery, Required] int count,
        CancellationToken cancellationToken
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        // TODO: Check if user has permission to view messages at this channel at service.

        var result = await mediator.Send(new GetChatMessagesQuery(
            userId, channelId, direction, cursor, count
        ), cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<GetMessagesResponse>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse<GetMessagesResponse>(null, result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse<GetMessagesResponse>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<GetMessagesResponse>(null, result.Error)),
        };
    }
    
    [HttpGet("attachments/{attachmentId:guid}")]
    [ResponseCache(Duration = 1800, Location = ResponseCacheLocation.Client)]
    public ActionResult GetAvatarUrl(Guid attachmentId) {
        return Redirect(blobUrlProvider.GetMessageAttachmentPreSignedUrl(attachmentId));
    }

    public record SendMessageRequest(
        [StringLength(1024, ErrorMessage = "Message body can only have maximum length of 1024 characters.")]
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
