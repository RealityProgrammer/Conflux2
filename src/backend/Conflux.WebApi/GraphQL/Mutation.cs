using HotChocolate.Authorization;

namespace Conflux.WebApi.GraphQL;

[MutationType]
[Authorize]
public partial class Mutation;