using Conflux.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Authenticate & Authorization.
builder.Services
    .AddIdentityCore<ApplicationUser>(options => {
        options.SignIn.RequireConfirmedAccount = false;
        options.User.RequireUniqueEmail = true;
        options.ClaimsIdentity.RoleClaimType = ClaimTypes.Role;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddRoleManager<RoleManager<IdentityRole<Guid>>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

var authBuilder = builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options => {
    options.TokenValidationParameters = new() {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
    };
});

authBuilder.AddIdentityCookies(config => {
    config.ApplicationCookie!.Configure(configOptions => {
        configOptions.LoginPath = "/auth#login";
        configOptions.LogoutPath = "/api/auth/logout";
        configOptions.AccessDeniedPath = "/denied";
    });
});

builder.Services.AddAuthorization();

// API related services.
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => {
    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme.",
    });
    options.AddSecurityRequirement(document => new() {
        [new("bearer", document)] = []
    });
});

// Database related services.
builder.Services.AddDbContextFactory<ApplicationDbContext>(options => {
    options.UseNpgsql(builder.Configuration.GetConnectionString("Database"), options => {
        options.MigrationsAssembly("Conflux.Infrastructure");
    });
});

// Security reinforcement.
builder.Services.AddCors(options => {
    options.AddPolicy("FrontendPolicy", policy => {
        policy.WithOrigins(builder.Configuration["Frontend:Origin"]!)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// Configure OpenAPI and Swagger for development environment.
if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapGet("/health", () => Results.Ok());

app.MapControllers();

app.UseCors("FrontendPolicy");

app.Run();