using Conflux.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Authenticate.
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options => {
    options.TokenValidationParameters = new() {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
    };
});

builder.Services.AddAuthorization();

// API related services.
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Database related services.
builder.Services.AddDbContextFactory<ApplicationDbContext>(options => {
    options.UseNpgsql(builder.Configuration.GetConnectionString("Database"), options => {
        options.MigrationsAssembly("Conflux.Infrastructure");
    });
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

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