using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain;
using Conflux.WebApi.Attributes;
using Humanizer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        await using var stream = request.Avatar == null ? Stream.Null : request.Avatar.OpenReadStream();
        var result = await communityServerService.Create(userId, request.Name, stream);

        if (result.IsSuccess) {
            return Created();
        }
        
        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error));
    }

    public sealed record CreateRequest([Required, StringLength(48)] string Name, IFormFile? Avatar) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext context) {
            var results = new List<ValidationResult>();

            Validator.TryValidateProperty(Name, new(this, null, null) {
                MemberName = nameof(Name),
            }, results);
            
            var configuration = context.GetService<IConfiguration>()!;
            var options = configuration.GetSection("Services:User").Get<CommunityServerServiceOptions>()!;
                
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