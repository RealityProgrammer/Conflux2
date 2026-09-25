// ReSharper disable AccessToDisposedClosure
// ReSharper disable VariableHidesOuterVariable

using Conflux.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Amazon.S3;
using Conflux.Application.Dto;
using Conflux.Application.Enums;
using Conflux.Application.Features.Servers;
using Conflux.Application.FileFormats;
using Conflux.Application.Options;
using Conflux.Application.Pipelines;
using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Conflux.Infrastructure;
using Conflux.Infrastructure.Repositories;
using Conflux.WebApi;
using Conflux.WebApi.Controllers;
using Conflux.WebApi.Filters;
using Conflux.WebApi.GraphQL;
using Conflux.WebApi.GraphQL.Middlewares;
using Conflux.WebApi.Jobs;
using Conflux.WebApi.Miscs;
using Conflux.WebApi.Notifications;
using Conflux.WebApi.Notifications.Users;
using Conflux.WebApi.Services;
using Conflux.WebApi.Services.Implementations;
using Conflux.WebApi.SignalR;
using FileSignatures;
using FileSignatures.Formats;
using HotChocolate.Execution;
using HotChocolate.Types.Descriptors;
using Mediator;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.JsonWebTokens;
using RedLockNet;
using RedLockNet.SERedis;
using RedLockNet.SERedis.Configuration;
using ScottBrady91.AspNetCore.Identity;
using StackExchange.Redis;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Error = Conflux.Domain.Error;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

bool isDevelopment = builder.Environment.IsDevelopment();

// keys and stuffs
builder.Configuration.AddKeyPerFile("/run/secrets", true);

// Authenticate & Authorization.
builder.Services.AddScoped<IPasswordHasher<ApplicationUser>, Argon2PasswordHasher<ApplicationUser>>();

builder.Services
    .AddIdentityCore<ApplicationUser>(options => {
        options.SignIn.RequireConfirmedAccount = false;
        options.User.RequireUniqueEmail = true;
        options.ClaimsIdentity.RoleClaimType = "role";
        options.Password.RequiredLength = 8;
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

builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) => {
        context.HttpContext.Response.ContentType = "application/json";

        await context.HttpContext.Response.WriteAsJsonAsync(new ApiResponse(Errors.TooManyRequests()), cancellationToken);
    };

    options.AddPolicy("CreateServerInvitationPolicy", httpContext => {
        if (httpContext.User.Identity?.IsAuthenticated != true) {
            return RateLimitPartition.GetNoLimiter("Unauthorized");
        }

        string userId =
            httpContext.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
            httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        
        return RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: userId,
            factory: _ => new() {
                // allow for 10 invitation create per hour (sliding: 2 per 12 min)
                PermitLimit = 10,
                SegmentsPerWindow = 5,
                Window = TimeSpan.FromHours(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }
        );
    });
});

// cache related services
var redisConnectionString = builder.Configuration.GetConnectionString("Valkey") ?? 
                            throw new InvalidOperationException("Missing Valkey connection string.");

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

// GraphQL
// TODO: Implement this: https://chillicream.com/docs/hotchocolate/performance/automatic-persisted-operations
builder.Services
    .AddGraphQLServer()
    .AddConvention<INamingConventions, CSharpEnumNamingConventions>()
    .AddWebApiTypes()
    .AddProjections()
    .AddSorting()
    .AddAuthorization()
    .AddFiltering<CustomFilterConvention>()
    .DisableIntrospection(!isDevelopment)
    .AddMutationConventions(applyToAllMutations: true)
    .AddMaxExecutionDepthRule(8)
    .AddMaxAllowedFieldCycleDepthRule(defaultCycleLimit: 3)
    .ModifyParserOptions(opt => {
        opt.MaxAllowedFields = 256;
        opt.MaxAllowedRecursionDepth = 8;
        opt.MaxAllowedDirectives = 4;
    })
    .ModifyPagingOptions(options => {
        options.MaxPageSize = 100;
        options.DefaultPageSize = 20;
    })
    .ModifyRequestOptions(options => {
        options.ExecutionTimeout = TimeSpan.FromSeconds(10);
    });

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
builder.Services.AddMediator(options => {
    options.Assemblies = [
        typeof(CreateServerCommand),
        typeof(UpdateDmConversationListNotificationHandler),
    ];
    options.PipelineBehaviors = [
        typeof(ServerAuthorizationPipelineBehaviour<,>),
        typeof(ServerMemberInteractAuthorizationPipelineBehaviour<,>),
        typeof(KickServerMemberValidationPipeline),
        typeof(WarnServerMemberValidationPipeline),
        typeof(BanServerMemberValidationPipeline),
    ];
    options.ServiceLifetime = ServiceLifetime.Scoped;
});

builder.Services
    .AddSingleton<JoinTracker>()
    .AddSingleton<SignalRConnectionTracker>()
    .AddScoped<ITypingIndicatorService, TypingIndicatorService>();

builder.Services.AddSignalR()
    .AddJsonProtocol(options => {
        options.PayloadSerializerOptions.Converters.Add(
            new JsonStringEnumConverter()
        );
    });

// Conflux services.
builder.Services
    .AddScoped<IChannelAuthorizationStrategy, DmChannelAuthorizationStrategy>()
    .AddScoped<IChannelAuthorizationStrategy, ServerTextChannelAuthorizationStrategy>()
    .AddScoped<IChannelAuthorizationStrategy, ServerVoiceChannelAuthorizationStrategy>()
    .AddScoped<IChannelAuthorizationService, ChannelAuthorizationService>()
    .AddScoped<IJwtProvider, JwtProvider>()
    .AddScoped<IJwtStorage, JwtStorage>()
    .AddScoped<IServerPermissionsProvider, ServerPermissionsProvider>()
    .AddScoped<IServerPermissionsCacheService, ServerPermissionsCacheService>()
    .AddScoped<IPresenceCacheService, PresenceCacheService>()
    .AddScoped<IPresenceService, PresenceService>()

    .AddScoped<IServerMemberReadRepository, ServerMemberRepository>()
    .AddScoped<IServerMemberWriteRepository>(services =>
        (ServerMemberRepository)services.GetRequiredService<IServerMemberReadRepository>()
    )
    .AddScoped<IUserRepository, UserRepository>()
    .AddScoped<IFriendRequestRepository, FriendRequestRepository>()
    .AddScoped<IConversationRepository, ConversationRepository>()
    .AddScoped<IMessageRepository, MessageRepository>()
    .AddScoped<ICommunityServerRepository, CommunityServerRepository>()
    .AddScoped<IChannelCategoryRepository, ChannelCategoryRepository>()
    .AddScoped<IInvitationRepository, InvitationRepository>()
    .AddScoped<ICommunityServerRoleRepository, CommunityServerRoleRepository>()
    .AddScoped<IChannelRepository, ChannelRepository>()
    .AddScoped<IServerModerationLogReadRepository, ServerModerationLogRepository>()
    .AddScoped<IServerModerationLogWriteRepository>(services => 
        (ServerModerationLogRepository)services.GetRequiredService<IServerModerationLogReadRepository>()
    )

    .AddScoped<IUnitOfWork, UnitOfWork>()

    .Configure<AuthServiceOptions>(builder.Configuration.GetSection("Services:Auth"))
    .Configure<UserServiceOptions>(builder.Configuration.GetSection("Services:User"))
    .Configure<MessagingServiceOptions>(builder.Configuration.GetSection("Services:Messaging"))
    .Configure<CommunityServerServiceOptions>(builder.Configuration.GetSection("Services:CommunityServer"))
    .Configure<InvitationOptions>(builder.Configuration.GetSection("Services:Invitation"));
    

// blob service.
var s3Settings = builder.Configuration.GetSection("S3").Get<StorageServiceOptions>()
                 ?? throw new InvalidOperationException("Missing configuration of S3.");

builder.Services.AddSingleton<IAmazonS3>(_ => {
    var config = new AmazonS3Config {
        ServiceURL = s3Settings.ServiceUrl,
        ForcePathStyle = true,
        AuthenticationRegion = s3Settings.Region,
        UseHttp = s3Settings.ServiceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
    };
    
    return new AmazonS3Client(s3Settings.AccessKey, s3Settings.SecretKey, config);
});

builder.Services.AddKeyedSingleton<IAmazonS3>("PreSigningClient", (_, _) => {
    var config = new AmazonS3Config {
        ServiceURL = s3Settings.PreSignUrl,
        ForcePathStyle = true,
        AuthenticationRegion = s3Settings.Region,
        UseHttp = s3Settings.PreSignUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
    };
    
    return new AmazonS3Client(s3Settings.AccessKey, s3Settings.SecretKey, config);
});

builder.Services.Configure<StorageServiceOptions>(builder.Configuration.GetSection("S3"));

builder.Services
    .AddSingleton<IBlobStorage, StorageService>()
    .AddScoped<IUserMediaService, UserMediaService>()
    .AddScoped<IServerMediaService, ServerMediaService>()
    .AddScoped<IMessageMediaService, MessageMediaService>();

// only AddControllersWithViews support for antiforgery for some reason.
// https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0#antiforgery-with-addcontrollers
builder.Services.AddControllersWithViews(options => {
    options.Filters.Add<AntiforgeryValidationFilter>();
    options.ModelBinderProviders.Insert(0, new PatchFieldModelBinderProvider());
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
            new(null, Errors.ValidationErrorsOccurred(validationErrors));

        return new BadRequestObjectResult(response);
    };
});

builder.Services.AddOpenApi(options => {
    options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1;
    
    options.AddSchemaTransformer((schema, context, _) => {
        // aspnetcore accept string for number field, so make openapi strip that
        if (schema.Type.HasValue && schema.Type.Value.HasFlag(JsonSchemaType.Integer)) {
            schema.Type &= ~JsonSchemaType.String;
        }
        
        var targetType = context.JsonTypeInfo?.Type ?? context.ParameterDescription?.Type;
        
        if (targetType == null) {
            return Task.CompletedTask;
        }
        
        var underlyingEnumType = Nullable.GetUnderlyingType(targetType) ?? targetType;
        
        if (underlyingEnumType.IsEnum) {
            ConfigureEnumSchema(schema, underlyingEnumType);
            return Task.CompletedTask;
        }
        
        // intercept collection types
        if (targetType.IsGenericType) {
            var typeDef = targetType.GetGenericTypeDefinition();
            
            // if type is dictionary, grab the key type, check if it is an enum and generate the schema of it.
            if (typeDef == typeof(Dictionary<,>) || typeDef == typeof(IDictionary<,>) || typeDef == typeof(IReadOnlyDictionary<,>)) {
                var genericArgs = targetType.GetGenericArguments();
                
                var keyType = genericArgs[0];
                var valueType = genericArgs[1];
            
                var valueSchema = schema.AdditionalProperties ?? new OpenApiSchema();
                
                if (valueType.IsEnum && valueSchema is OpenApiSchema concreteValueSchema) {
                    ConfigureEnumSchema(concreteValueSchema, valueType);
                }
                
                if (keyType.IsEnum) {
                    schema.Type = JsonSchemaType.Object;
                    schema.Properties ??= new Dictionary<string, IOpenApiSchema>();

                    foreach (var name in Enum.GetNames(keyType)) {
                        schema.Properties[name] = valueSchema;
                    }

                    schema.AdditionalProperties = null;
                }
                
                return Task.CompletedTask;
            }

            // same to List element type
            if (typeDef == typeof(List<>) || typeDef == typeof(IList<>) || typeDef == typeof(IReadOnlyList<>)) {
                var elementType = targetType.GetGenericArguments()[0];

                if (elementType.IsEnum && schema.Items is OpenApiSchema itemSchema) {
                    ConfigureEnumSchema(itemSchema, elementType);
                }

                return Task.CompletedTask;
            }
            
            if (typeDef == typeof(PatchField<>)) {
                var elementType = targetType.GetGenericArguments()[0];
                
                schema.Properties?.Clear();
                schema.AdditionalProperties = null;
                schema.Type = null;
                schema.Items = null;

                MapTypeToSchema(schema, elementType);
                
                return Task.CompletedTask;
            }
        }
        
        if (targetType == typeof(Error)) {
            schema.Type = JsonSchemaType.Object;

            schema.Properties = new Dictionary<string, IOpenApiSchema> {
                ["code"] = new OpenApiSchema { Type = JsonSchemaType.String | JsonSchemaType.Null },
                ["message"] = new OpenApiSchema { Type = JsonSchemaType.String | JsonSchemaType.Null },
                ["details"] = new OpenApiSchema { Type = JsonSchemaType.String | JsonSchemaType.Object | JsonSchemaType.Null },
            };
            
            return Task.CompletedTask;
        }
        
        return Task.CompletedTask;
        
        static void ConfigureEnumSchema(OpenApiSchema schema, Type enumType) {
            schema.Type = JsonSchemaType.String;
            schema.Format = null;
            schema.Enum = [..Enum.GetNames(enumType).Select(n => JsonValue.Create(n))];
        }
        
        static void MapTypeToSchema(OpenApiSchema schema, Type type) {
            var isNullable = Nullable.GetUnderlyingType(type) != null;
            var underlyingType = isNullable ? Nullable.GetUnderlyingType(type)! : type;

            if (underlyingType.IsEnum) {
                ConfigureEnumSchema(schema, underlyingType);
                if (isNullable && schema.Type.HasValue) schema.Type |= JsonSchemaType.Null;
                return;
            }

            // Primitives
            if (underlyingType == typeof(string)) {
                schema.Type = JsonSchemaType.String;
            } else if (underlyingType == typeof(bool)) {
                schema.Type = JsonSchemaType.Boolean;
            } else if (underlyingType == typeof(int) || underlyingType == typeof(long) || underlyingType == typeof(short) || underlyingType == typeof(byte)) {
                schema.Type = JsonSchemaType.Integer;
            } else if (underlyingType == typeof(float) || underlyingType == typeof(double) || underlyingType == typeof(decimal)) {
                schema.Type = JsonSchemaType.Number;
            } else if (underlyingType == typeof(Guid)) {
                schema.Type = JsonSchemaType.String;
                schema.Format = "uuid";
            } else if (underlyingType == typeof(DateTime) || underlyingType == typeof(DateTimeOffset)) {
                schema.Type = JsonSchemaType.String;
                schema.Format = "date-time";
            } 
            // Arrays & Lists
            else if (underlyingType.IsArray) {
                schema.Type = JsonSchemaType.Array;
                schema.Items = new OpenApiSchema();
                
                MapTypeToSchema((OpenApiSchema)schema.Items, underlyingType.GetElementType()!);
            } else if (underlyingType.IsGenericType && (
                           underlyingType.GetGenericTypeDefinition() == typeof(List<>) || 
                           underlyingType.GetGenericTypeDefinition() == typeof(IList<>) || 
                           underlyingType.GetGenericTypeDefinition() == typeof(IEnumerable<>) || 
                           underlyingType.GetGenericTypeDefinition() == typeof(IReadOnlyList<>))) {
                schema.Type = JsonSchemaType.Array;
                schema.Items = new OpenApiSchema();
                
                MapTypeToSchema((OpenApiSchema)schema.Items, underlyingType.GetGenericArguments()[0]);
            } else {
                schema.Metadata ??= new Dictionary<string, object>();
                schema.Metadata["x-schema-id"] = underlyingType.Name;
            }
            
            if (isNullable && schema.Type.HasValue) {
                schema.Type |= JsonSchemaType.Null;
            }
        }
    });

    options.AddDocumentTransformer((document, _, _) => {
        document.Components ??= new();

        var extraEnums = new[] {
            typeof(ServerPermission),
            typeof(MessageLoadDirection),
            typeof(InvitationController.InvitationExpireAfter),
            typeof(CommunityServerChannelType),
            typeof(PermissionState),
        };

        foreach (var enumType in extraEnums) {
            if (document.Components.Schemas is { } schemas && !schemas.ContainsKey(enumType.Name)) {
                var enumSchema = new OpenApiSchema {
                    Type = JsonSchemaType.String,
                    Enum = [..Enum.GetNames(enumType).Select(n => JsonValue.Create(n))]
                };

                schemas.Add(enumType.Name, enumSchema);
            }
        }

        return Task.CompletedTask;
    });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => {
    options.SchemaFilter<PatchFieldSchemaFilter>();
    
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
if (isDevelopment) {
    builder.Services.AddHttpLogging(options => {
        options.LoggingFields = HttpLoggingFields.Request | HttpLoggingFields.Response;
    });
}

// Database related services.
builder.Services.AddSingleton<CreateTimestampInterceptor>();

builder.Services.AddDbContextFactory<ApplicationDbContext>((services, options) => {
    var createTimestampInterceptor = services.GetRequiredService<CreateTimestampInterceptor>();
    
    options
        .UseNpgsql(builder.Configuration.GetConnectionString("Database"), options => {
            options.MigrationsAssembly("Conflux.Infrastructure");
        })
        .AddInterceptors(createTimestampInterceptor);
});

// jobs/workers
builder.Services
    .AddHostedService<InvitationCleanupWorker>()
    .AddHostedService<GhostConnectionCleanupWorker>();

var app = builder.Build();

// actions for development environment only
if (app.Environment.IsDevelopment()) {
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    
    // export the graphql schema into file at project root.
    var executorManager = services.GetRequiredService<IRequestExecutorManager>();
    var executor = await executorManager.GetExecutorAsync();
    var schemaText = executor.Schema.ToString();
    var schemaPath = System.IO.Path.Combine(app.Environment.ContentRootPath, "schema.graphql");
    
    await File.WriteAllTextAsync(schemaPath, schemaText);
    
    // seeding database

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

app.UseRateLimiter();

// Configure some helper services in development environment.
if (app.Environment.IsDevelopment()) {
    // swagger
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();
    
    // http logging to print incoming requests and outcoming responses.
    app.UseHttpLogging();
}

app.MapControllers();
app.MapGraphQL();
app.MapNitroApp().WithOptions(options => {
    options.Enable = app.Environment.IsDevelopment();
});
app.MapHub<GatewayHub>("/hub");

await ExecuteDatabaseMigration();

app.Run();
return;

async Task ExecuteDatabaseMigration() {
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;

    var context = services.GetRequiredService<ApplicationDbContext>();

    if (context.Database.GetPendingMigrations().Any()) {
        await context.Database.MigrateAsync();
    }
}