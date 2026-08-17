using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain;
using Conflux.WebApi.Attributes;
using Humanizer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;

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
}