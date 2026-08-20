using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Humanizer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/communities")]
[Authorize]
public sealed class CommunityServerController(
    ICommunityServerService communityServerService
) : ControllerBase {
    [HttpPost]
    [Idempotent(360)]
    public async Task<ActionResult<ApiResponse>> CreateCommunityServer([FromForm] CreateRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        await using var stream = request.Avatar?.OpenReadStream();
        var result = await communityServerService.Create(userId, request.Name, stream);

        if (result.IsSuccess) {
            return Created();
        }
        
        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error));
    }
    
    [HttpGet("{serverId:guid}/avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public RedirectResult GetAvatarUrl(Guid serverId) {
        var result = communityServerService.GetAvatarUrl(serverId);
        return Redirect(result);
    }

    [HttpGet("{serverId:guid}/summary")]
    public async Task<ActionResult<ApiResponse<CommunityServerSummaryDto>>> GetSummary(Guid serverId) {
        var result = await communityServerService.GetSummary(serverId);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<CommunityServerSummaryDto>(result.Value!, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{serverId:guid}/channel-categories")]
    [Idempotent(15)]
    public async Task<ActionResult<ApiResponse<Guid>>> CreateChannelCategory(
        Guid serverId, 
        [FromBody] ChannelCategoryCreateRequest request
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await communityServerService.CreateChannelCategory(userId, serverId, request.Name);

        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<Guid>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{serverId:guid}/channels")]
    [Idempotent(15)]
    public async Task<ActionResult<ApiResponse<Guid>>> CreateChannels(
        Guid serverId,
        [FromBody] ChannelCreateRequest request
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        ChannelType type = request.Type switch {
            ChannelCreateType.Text => ChannelType.CommunityServerText,
            ChannelCreateType.Voice => ChannelType.CommunityServerVoice,
            _ => throw new UnreachableException(),
        };

        var result = await communityServerService.CreateChannel(userId, serverId, request.Name, type, request.CategoryId);

        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<Guid>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpDelete("{serverId:guid}/channel-categories/{categoryId:guid}")]
    public async Task<ActionResult> DeleteChannelCategory(Guid serverId, Guid categoryId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await communityServerService.DeleteChannelCategory(userId, serverId, categoryId);
        
        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpDelete("{serverId:guid}/channels/{channelId:guid}")]
    public async Task<ActionResult> DeleteChannel(Guid serverId, Guid channelId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await communityServerService.DeleteChannel(userId, serverId, channelId);
        
        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record CreateRequest(
        [Required] string Name, 
        IFormFile? Avatar
    ) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext context) {
            var results = new List<ValidationResult>();

            if (Name.Length > 48) {
                results.Add(new(
                    "Name can only have maximum length of 48 characters.", 
                    [nameof(Name)]
                ));
            }
            
            var options = context.GetRequiredService<IOptions<CommunityServerServiceOptions>>().Value;
                
            if (Avatar != null && Avatar.Length > options.MaxAvatarSizeBytes) {
                results.Add(new(
                    $"Avatar must be smaller than {options.MaxAvatarSizeBytes.Bytes():MB}.", 
                    [nameof(Avatar)]
                ));
            }

            return results;
        }
    }

    public sealed record ChannelCategoryCreateRequest(
        [StringLength(32, ErrorMessage = "{0} can only have maximum length of {1} characters.")] string Name
    );

    public enum ChannelCreateType {
        Text,
        Voice,
    }

    public sealed record ChannelCreateRequest(
        [StringLength(32, ErrorMessage = "{0} can only have maximum length of {1} characters.")] string Name,
        ChannelCreateType Type,
        Guid? CategoryId
    );
}