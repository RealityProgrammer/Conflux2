namespace Conflux.WebApi;

public readonly record struct ApiResponse(string? Message);
public readonly record struct ApiResponse<T>(T? Data, string? Message);