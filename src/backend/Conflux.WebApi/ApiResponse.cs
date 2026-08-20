using System.Text.Json.Serialization;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi;

public record ApiResponse(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    Error Error
);

public sealed record ApiResponse<T>(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    T? Data, 
    Error Error
) : ApiResponse(Error);