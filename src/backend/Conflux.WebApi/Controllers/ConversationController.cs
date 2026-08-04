using Conflux.Application.Dto.Requests;
using Conflux.Application.Interfaces;
using Conflux.Application.Interfaces.Implementations;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Humanizer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class ConversationController(
    IMessageService messageService,
    IStorageService storageService
) : ControllerBase {
    [HttpPost("channels/{channelId:guid}/messages")]
    public async Task<ActionResult<ApiResponse<MessageDto>>> SendMessage(
        Guid channelId, 
        [FromForm] SendMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<MessageDto>(null, Errors.InvalidIdentifier()));
        }

        if (request.Body.AsSpan().Trim().IsEmpty && request.Attachments is not { Length: > 0 }) {
            return BadRequest(new ApiResponse<MessageDto>(null, Errors.EmptyMessageContent()));
        }

        Stream[] attachmentStreams;

        if (request.Attachments is { Length: > 0 }) {
            attachmentStreams = new Stream[request.Attachments.Length];

            for (int i = 0; i < attachmentStreams.Length; i++) {
                attachmentStreams[i] = request.Attachments[i].OpenReadStream();
            }
        } else {
            attachmentStreams = [];
        }

        try {
            Result<MessageDto> result = 
                await messageService.SendMessageAsync(userId, channelId, request.Body, attachmentStreams, cancellationToken);

            if (result.IsSuccess) {
                return Created((string?)null, new ApiResponse<MessageDto>(result.Value, Error.None));
            }

            return result.Error.Code switch {
                nameof(Errors.ValidationErrorsOccured) => BadRequest(new ApiResponse(result.Error)),
                nameof(Errors.AttachmentUploadFailure) => StatusCode(StatusCodes.Status502BadGateway, new ApiResponse(result.Error)),
                _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<MessageDto>(null, Errors.UnexpectedError())),
            };
        } finally {
            foreach (var stream in attachmentStreams) {
                await stream.DisposeAsync();
            }
        }
    }

    [HttpGet("channels/{channelId:guid}/messages")]
    public async Task<ActionResult<ApiResponse<GetMessagesResult>>> LoadMessage(
        Guid channelId,
        [FromQuery] MessageLoadDirection? direction,
        [FromQuery] Guid? cursor,
        [FromQuery, Required] int count,
        CancellationToken cancellationToken
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out _)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        // TODO: Check if user has permission to view messages at this channel at service.

        Result<GetMessagesResult> result = 
            await messageService.GetMessagesAsync(channelId, direction, cursor, count, cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<GetMessagesResult>(result.Value, Error.None));
        }
        
        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<GetMessagesResult>(null, result.Error));
    }
    
    [HttpGet("attachments/{attachmentId:guid}")]
    [ResponseCache(Duration = 1800, Location = ResponseCacheLocation.Client)]
    public async Task<ActionResult> GetAvatarUrl(Guid attachmentId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out _)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = messageService.GetAttachmentUrl(attachmentId, Request.IsHttps);
        return Redirect(result);
    }

    public record SendMessageRequest(
        [StringLength(1024, ErrorMessage = "Message body surpassed 1024 characters.")]
        string? Body,

        [MaxLength(4, ErrorMessage = "Only 4 attachments allowed in a message.")]
        IFormFile[]? Attachments
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

                    if (!attachment.ContentType.StartsWith("image/")) {
                        yield return new($"Attachment must be an image.", [
                            nameof(Attachments),
                        ]);
                    }
                }
            }
        }
    }
}