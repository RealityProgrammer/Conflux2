namespace Conflux.Application.Dto.Responses;

public sealed record OpenAvatarResponse(Stream AvatarStream, string ContentType, IDisposable DisposeObject);