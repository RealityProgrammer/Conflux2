using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Authenticate & Authorization.
builder.Services
    .AddIdentityCore<ApplicationUser>(options => {
        options.SignIn.RequireConfirmedAccount = false;
        options.User.RequireUniqueEmail = true;
        options.ClaimsIdentity.RoleClaimType = "role";
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
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Missing configuration of JWT secret at Jwt:Secret."))),
    };

    options.MapInboundClaims = false;

    options.Events = new() {
        OnMessageReceived = context => {
            if (context.Request.Cookies.TryGetValue("X-Access-Token", out var token)) {
                context.Token = token;
            }
            
            return Task.CompletedTask;
        }
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

builder.Services.AddAntiforgery(options => {
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

// Security reinforcement.
builder.Services.AddCors(options => {
    options.AddPolicy("FrontendPolicy", policy => {
        var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? throw new InvalidOperationException("Missing configuration of frontend origin at Frontend:Origin.");
        
        policy.WithOrigins(frontendOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// API related services.
builder.Services
    .AddScoped<IAuthService, AuthService>()
    .Configure<AuthServiceOptions>(builder.Configuration.GetSection("Services:Auth"))

    .AddScoped<IUserService, UserService>();

builder.Services.AddSingleton<IMailingService, MailingService>();

// only AddControllersWithViews support for antiforgery for some reason.
// https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0#antiforgery-with-addcontrollers
builder.Services.AddControllersWithViews(options => {
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
});
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

// enable http logging in dev environment.
if (builder.Environment.IsDevelopment()) {
    builder.Services.AddHttpLogging(options => {
        options.LoggingFields = HttpLoggingFields.Request | HttpLoggingFields.Response;
    });
}

// Database related services.
builder.Services.AddDbContextFactory<ApplicationDbContext>(options => {
    options.UseNpgsql(builder.Configuration.GetConnectionString("Database"), options => {
        options.MigrationsAssembly("Conflux.Infrastructure");
    });
});

var app = builder.Build();

app.UseHttpsRedirection();

app.UseCors("FrontendPolicy");
app.UseAntiforgery();

app.UseAuthentication();
app.UseAuthorization();

// Configure some helper services in development environment.
if (app.Environment.IsDevelopment()) {
    // swagger
    app.UseSwagger();
    app.UseSwaggerUI();
    
    // http logging to print incoming requests and outcoming responses.
    app.UseHttpLogging();
}


app.MapControllers();

app.Run();