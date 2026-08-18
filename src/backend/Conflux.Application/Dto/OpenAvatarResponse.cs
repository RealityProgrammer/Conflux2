namespace Conflux.Application.Dto;

public sealed record OpenAvatarResponse(Stream AvatarStream, string ContentType, IDisposable DisposeObject);