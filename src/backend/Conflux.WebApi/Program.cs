using Conflux.Domain;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Add database services.
builder.Services.AddDbContextFactory<ApplicationDbContext>(options => {
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"), options => {
        options.MigrationsAssembly("Conflux.Infrastructure");
    });
});

var app = builder.Build();

// Configure OpenAPI and Swagger for development environment.
if (app.Environment.IsDevelopment()) {
    app.MapOpenApi();
    
    app.UseSwaggerUI(options => {
        options.SwaggerEndpoint("/openapi/v1.json", "v1");
    });
}

app.UseHttpsRedirection();

app.MapGet("/health", () => Results.Ok());

app.MapControllers();

app.Run();