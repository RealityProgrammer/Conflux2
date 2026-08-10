using Conflux.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Amazon.S3;
using Conflux.Application.FileFormats;
using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Conflux.Infrastructure;
using Conflux.Infrastructure.Repositories;
using Conflux.WebApi;
using Conflux.WebApi.Filters;
using Conflux.WebApi.Miscs;
using Conflux.WebApi.SignalR;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.AspNetCore.SignalR;
using RedLockNet;
using RedLockNet.SERedis;
using RedLockNet.SERedis.Configuration;
using ScottBrady91.AspNetCore.Identity;
using StackExchange.Redis;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Authenticate & Authorization.
builder.Services.AddScoped<IPasswordHasher<ApplicationUser>, Argon2PasswordHasher<ApplicationUser>>();

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

// Policies and other security related services.
builder.Services.AddCors(options => {
    options.AddPolicy("FrontendPolicy", policy => {
        var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? throw new InvalidOperationException("Missing configuration of frontend origin at Frontend:Origin.");
        
        policy.WithOrigins(frontendOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// redis related services
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? 
                            throw new InvalidOperationException("Missing Redis connection string.");

await using ConnectionMultiplexer multiplexer = await ConnectionMultiplexer.ConnectAsync(redisConnectionString);

builder.Services.AddSingleton<IConnectionMultiplexer>(multiplexer);

builder.Services
    .AddStackExchangeRedisCache(options => {
        options.ConnectionMultiplexerFactory = () => Task.FromResult<IConnectionMultiplexer>(multiplexer);
        options.InstanceName = "Conflux";
    });

using var redLockFactory = RedLockFactory.Create(new List<RedLockMultiplexer> {
    new(multiplexer),
});

builder.Services.AddSingleton<IDistributedLockFactory>(redLockFactory);

// general services needed
builder.Services.AddSingleton<IFileFormatInspector>(new FileFormatInspector(
    [
        new Png(),
        new Gif(),
        new Jpeg(),
        new Mpeg3(),
        new Ogg(),
        new Webp(),
        new Mpeg4Iso4(),
        new MP4(),
        new MP4V1(),
        new Wav(),
    ]
));
builder.Services.AddSingleton<IUserIdProvider, JwtUserIdProvider>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddMediator();
builder.Services.AddSignalR();

// Conflux services.
builder.Services
    .AddScoped<IChannelAuthorizationStrategy, DmChannelAuthorizationStrategy>()
    .AddScoped<IChannelAuthorizationService, ChannelAuthorizationService>()
        
    .AddScoped<IUnitOfWork, UnitOfWork>()
    .AddScoped<IStorageService, StorageService>()
        
    .AddScoped<IAuthRepository, AuthRepository>()
    .AddScoped<IAuthService, AuthService>()
    .Configure<AuthServiceOptions>(builder.Configuration.GetSection("Services:Auth"))

    .AddScoped<IUserRepository, UserRepository>()
    .AddScoped<IUserService, UserService>()
    .Configure<UserServiceOptions>(builder.Configuration.GetSection("Services:User"))
    
    .AddScoped<IFriendRequestRepository, FriendRequestRepository>()
    .AddScoped<IFriendService, FriendService>()
    
    .AddScoped<IChannelRepository, ChannelRepository>()
    .AddScoped<IChannelService, ChannelService>()
    
    .AddScoped<IMessageRepository, MessageRepository>()
    .AddScoped<IMessageService, MessageService>()
    .Configure<MessagingServiceOptions>(builder.Configuration.GetSection("Services:Messaging"))
    
    .AddSingleton<IMailingService, MailingService>();

// Services related to external services.
builder.Services.AddAWSService<IAmazonS3>(builder.Configuration.GetAWSOptions("MediaAWS"));

// only AddControllersWithViews support for antiforgery for some reason.
// https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0#antiforgery-with-addcontrollers
builder.Services.AddControllersWithViews(options => {
    options.Filters.Add<AntiforgeryValidationFilter>();
}).AddJsonOptions(options => {
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
}).ConfigureApiBehaviorOptions(options => {
    options.InvalidModelStateResponseFactory = context => {
        var validationErrors = context.ModelState
            .Where(ms => ms.Value!.Errors.Count > 0)
            .ToDictionary(
                kvp => JsonNamingPolicy.CamelCase.ConvertName(kvp.Key), // blame the frontend
                kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
            );

        ApiResponse<Dictionary<string, string[]>> response = 
            new(null, Errors.ValidationErrorsOccured(validationErrors));

        return new BadRequestObjectResult(response);
    };
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
builder.Services.AddSingleton<CreateTimestampInterceptor>();

builder.Services.AddDbContext<ApplicationDbContext>((services, options) => {
    var createTimestampInterceptor = services.GetRequiredService<CreateTimestampInterceptor>();
    
    options
        .UseNpgsql(builder.Configuration.GetConnectionString("Database"), options => {
            options.MigrationsAssembly("Conflux.Infrastructure");
        })
        .AddInterceptors(createTimestampInterceptor);
});

var app = builder.Build();

if (app.Environment.IsDevelopment()) {
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;

    var logger = services.GetRequiredService<ILogger<DatabaseSeedHelper>>();

    try {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        await using var dbContext = services.GetRequiredService<ApplicationDbContext>();
        
        await DatabaseSeedHelper.SeedUserAsync(userManager, dbContext, logger);
    } catch (Exception e) {
        logger.LogError(e, "An error occurred while seeding the database.");
    }
}

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
app.MapHub<GatewayHub>("/hub");

app.Run();