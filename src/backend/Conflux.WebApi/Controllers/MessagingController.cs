using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain;
using Humanizer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("/api/channels/{channelId:guid}/messages")]
[Authorize]
public sealed class MessagingController(
    IMessagingService messagingService
) : ControllerBase {
    [HttpPost]
    public async Task<ActionResult<ApiResponse>> SendMessage(
        Guid channelId, 
        [FromForm] SendMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await messagingService.SendMessageAsync(request.Body, [], cancellationToken);

        if (result.IsSuccess) {
            return Created();
        }
        
        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.UnexpectedError()));
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

            if (Attachments != null && Attachments.Length > 0) {
                var configuration = validationContext.GetService<IConfiguration>()!;
                var options = configuration.GetSection("Services:User").Get<MessagingServiceOptions>()!;
                
                if (Attachments.Length > options.MaxAttachmentsCount) {
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