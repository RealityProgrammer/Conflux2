using HotChocolate.Authorization;

namespace Conflux.WebApi.GraphQL;

[MutationType]
[Authorize]
public static partial class Mutation;