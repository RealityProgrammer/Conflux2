using HotChocolate.Authorization;

namespace Conflux.WebApi.GraphQL;

[Authorize]
[QueryType]
public partial class Query;