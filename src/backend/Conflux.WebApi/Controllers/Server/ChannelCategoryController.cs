using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.WebApi.Attributes;
using Mediator;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.Controllers.Server;

[ApiController]
[Route("api/communities/{serverId:guid}/channel-categories")]
public sealed class ChannelCategoryController(
    ISender sender
) : ControllerBase {
    [HttpPost]
    [Idempotent(15)]
    public async Task<ActionResult<ApiResponse<ChannelCategoryIdentityDto>>> CreateChannelCategory(
        Guid serverId, 
        [FromBody] CreateChannelCategoryRequest request
    ) {
        var result = await sender.Send(new CreateServerChannelCategoryCommand(serverId, request.Name));

        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<ChannelCategoryIdentityDto>(result.Value, Domain.Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpDelete("{categoryId:guid}")]
    public async Task<ActionResult> DeleteChannelCategory(Guid serverId, Guid categoryId) {
        var result = await sender.Send(new DeleteServerChannelCategoryCommand(serverId, categoryId));
        
        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    public sealed record CreateChannelCategoryRequest(
        [StringLength(32, ErrorMessage = "{0} can only have maximum length of {1} characters.")] string Name
    );
}