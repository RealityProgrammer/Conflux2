using Conflux.Application.Dto;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Conflux.WebApi.Miscs;

public sealed class PatchFieldSchemaFilter : ISchemaFilter {
    public void Apply(IOpenApiSchema schema, SchemaFilterContext context) {
        if (schema is not OpenApiSchema openApiSchema) {
            return;
        }

        if (context.Type.IsGenericType && context.Type.GetGenericTypeDefinition() == typeof(PatchField<>)) {
            var innerType = context.Type.GetGenericArguments()[0];

            var innerSchema = context.SchemaGenerator.GenerateSchema(innerType, context.SchemaRepository);

            openApiSchema.Properties?.Clear();

            if (innerSchema is OpenApiSchema concreteInnerSchema) {
                openApiSchema.Type = concreteInnerSchema.Type.HasValue ? concreteInnerSchema.Type.Value | JsonSchemaType.Null : JsonSchemaType.Null;

                openApiSchema.Format = concreteInnerSchema.Format;
                openApiSchema.Items = concreteInnerSchema.Items;
                openApiSchema.Enum = concreteInnerSchema.Enum;

                if (concreteInnerSchema.Properties != null) {
                    openApiSchema.Properties ??= new Dictionary<string, IOpenApiSchema>();
                    foreach (var prop in concreteInnerSchema.Properties) {
                        openApiSchema.Properties[prop.Key] = prop.Value;
                    }
                }
            } else {
                openApiSchema.AnyOf = new List<IOpenApiSchema> {
                    innerSchema,
                };
                openApiSchema.Type = JsonSchemaType.Null;
            }
        }
    }
}