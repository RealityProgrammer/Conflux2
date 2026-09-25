using Conflux.Application.Dto;

namespace Conflux.WebApi.Dto;

public sealed record AvatarOperationInput(FileOperationType Type, IFormFile? File);