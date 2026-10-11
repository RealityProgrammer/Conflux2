using Conflux.Application.Dto;
using Conflux.Application.Features.Servers;
using Conflux.Application.Options;
using Conflux.Application.Services;
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

namespace Conflux.WebApi.Controllers.Server;

[ApiController]
[Route("api/communities")]
[Authorize]
public sealed class ServerController(
    IMediator mediator,
    IServerMediaService serverMediaService
) : ControllerBase {
    [HttpPost]
    [Idempotent(360)]
    public async Task<ActionResult<ApiResponse<ServerIdentityDto>>> CreateCommunityServer([FromForm] CreateServerRequest serverRequest) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        await using var stream = serverRequest.Avatar?.OpenReadStream();
        var result = await mediator.Send(new CreateServerCommand(userId, serverRequest.Name, stream));
        
        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<ServerIdentityDto>(result.Value, Error.None));
        }
        
        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error));
    }
    
    [HttpGet("{serverId:guid}/avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public async Task<RedirectResult> GetAvatarUrl(Guid serverId) {
        return Redirect(await serverMediaService.GetAvatarPreSignedUrl(serverId));
    }
    
    [HttpGet("{serverId:guid}/banner")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public async Task<RedirectResult> GetBannerUrl(Guid serverId) {
        return Redirect(await serverMediaService.GetBannerPreSignedUrl(serverId));
    }

    [HttpGet("{serverId:guid}/details")]
    public async Task<ActionResult<ApiResponse<ServerDetailsDto>>> GetDetails(Guid serverId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new GetServerDetailsQuery(serverId, userId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<ServerDetailsDto>(result.Value!, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpGet("{serverId:guid}/details/channel-categories")]
    public async Task<ActionResult<ApiResponse<IReadOnlyCollection<ChannelCategoryDetailDto>>>> GetChannelCategories(Guid serverId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new GetServerChannelCategoriesQuery(serverId, userId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<IReadOnlyCollection<ChannelCategoryDetailDto>>(result.Value!, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record CreateServerRequest(
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
}