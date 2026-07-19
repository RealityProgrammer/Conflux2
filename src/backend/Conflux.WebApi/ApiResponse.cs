namespace Conflux.WebApi;

public record ApiResponse(string? Message);
public record ApiResponse<T>(T? Data, string? Message);