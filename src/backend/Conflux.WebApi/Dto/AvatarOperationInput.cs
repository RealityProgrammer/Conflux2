using Conflux.Application.Dto;

namespace Conflux.WebApi.Dto;

public sealed record AvatarOperationInput(AvatarOperationType Type, IFormFile? File);