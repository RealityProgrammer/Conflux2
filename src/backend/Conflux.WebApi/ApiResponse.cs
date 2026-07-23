using Conflux.Application;
using System.Text.Json.Serialization;

namespace Conflux.WebApi;

public record ApiResponse(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    Error Error
);

public record ApiResponse<T>(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    T? Data, 
    
    Error Error
) : ApiResponse(Error);