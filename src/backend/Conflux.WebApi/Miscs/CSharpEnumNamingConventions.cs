using HotChocolate.Types.Descriptors;

namespace Conflux.WebApi.Miscs;

public sealed class CSharpEnumNamingConventions : DefaultNamingConventions {
    public override string GetEnumValueName(object value) {
        return value.ToString()!;
    }
}