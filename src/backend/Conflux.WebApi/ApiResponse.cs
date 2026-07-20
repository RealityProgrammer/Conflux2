using Conflux.Application;

namespace Conflux.WebApi;

public record ApiResponse(Error Error);
public record ApiResponse<T>(T? Data, Error Error) : ApiResponse(Error);