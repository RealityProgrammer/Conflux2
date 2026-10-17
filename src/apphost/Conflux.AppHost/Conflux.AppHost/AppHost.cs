using Microsoft.Extensions.Configuration;

var builder = DistributedApplication.CreateBuilder(args);

bool useLocalGarage = builder.Configuration.GetValue("USE_LOCAL_GARAGE", true);

var jwtSecret = builder.AddParameter("JWT-Secret", true);
var jwtIssuer = builder.AddParameter("JWT-Issuer");
var jwtAudience = builder.AddParameter("JWT-Audience");

var frontendOrigin = builder.AddParameter("Frontend-Origin");
var accessTokenDuration = builder.AddParameter("Auth-Access-Token-Duration");
var refreshTokenDuration = builder.AddParameter("Auth-Refresh-Token-Duration");
var maxAvatarSize = builder.AddParameter("Media-Max-Avatar-Size");
var maxBannerSize = builder.AddParameter("Media-Max-Banner-Size");
var maxMessageAttachmentSize = builder.AddParameter("Media-Max-Message-Attachment-Size");

var s3Endpoint = builder.AddParameter("S3-Endpoint", true);
var s3AccessKey = builder.AddParameter("S3-Access-Key", true);
var s3SecretKey = builder.AddParameter("S3-Secret-Key", true);
var s3Region = builder.AddParameter("S3-Region", true);
var s3BucketName = builder.AddParameter("S3-Bucket-Name", true);

var mailServerHost = builder.AddParameter("Mail-Server-Host");
var mailServerPort = builder.AddParameter("Mail-Server-Port");
var mailSenderName = builder.AddParameter("Mail-Sender-Name", secret: true);
var mailSenderEmail = builder.AddParameter("Mail-Sender-Email", secret: true);
var mailPassword = builder.AddParameter("Mail-Password", secret: true);

var garageRpcSecret = builder.AddParameter("Garage-Rpc-Secret", secret: true);

builder.AddDockerComposeEnvironment("compose")
    .WithDashboard(!builder.ExecutionContext.IsPublishMode);

var cache = builder
    .AddValkey("Valkey")
    .WithImageTag("alpine")
    .WithEndpoint(6379, 6379)
    .WithDataVolume();

var postgres = builder
    .AddPostgres("Postgres")
    .WithImageTag("18.6-alpine3.24")
    .WithEndpoint(5432, 5432)
    .WithDataVolume();

var database = postgres.AddDatabase("conflux");

IResourceBuilder<ContainerResource>? garage = null;

if (useLocalGarage) {
    var garageConfigPath = builder.ExecutionContext.IsPublishMode 
        ? "./garage/garage.toml" 
        : "../../../../garage/garage.toml";
    
    garage = builder
        .AddContainer("Garage", "dxflrs/garage", "v2.3.0")
        .WithHttpEndpoint(3900, 3900, "s3-api")
        .WithVolume("garage-data", "/var/lib/garage/data")
        .WithVolume("garage-meta", "/var/lib/garage/meta");

    if (!builder.ExecutionContext.IsPublishMode) {
        garage.WithBindMount(garageConfigPath, "/etc/garage.toml", true);
    }
    
    garage.WithEnvironment("GARAGE_RPC_SECRET", garageRpcSecret);

    garage.PublishAsDockerComposeService((resource, service) => {
        service.Volumes.Add(new() {
            Name = "GarageConfiguration",
            Type = "bind",
            Source = "./garage/garage.toml",
            Target = "/etc/garage.toml",
            ReadOnly = true,
        });

        foreach (var key in service.Environment.Keys.Where(k => k.Contains("BINDMOUNT"))) {
            service.Environment.Remove(key);
        }
    });
}

if (builder.ExecutionContext.IsPublishMode) {
    var backendApi = builder
        .AddDockerfile("backend", "../../../backend", "Dockerfile")
        .WithHttpEndpoint(port: 5127, targetPort: 5127, name: "http")
        .WithReference(database)
        .WithReference(cache)
        .WaitFor(database);

    backendApi
        .WithEnvironment("ASPNETCORE_URLS", "http://0.0.0.0:5127")
        .WithEnvironment("Frontend__Origin", frontendOrigin)
        
        .WithEnvironment("Auth__AccessTokenDuration", accessTokenDuration)
        .WithEnvironment("Auth__RefreshTokenDuration", refreshTokenDuration)
        .WithEnvironment("Media__MaxAvatarSize", maxAvatarSize)
        .WithEnvironment("Media__MaxBannerSize", maxBannerSize)
        .WithEnvironment("Media__MaxMessageAttachmentSize", maxMessageAttachmentSize)

        .WithEnvironment("JWT__Secret", jwtSecret)
        .WithEnvironment("JWT__Issuer", jwtIssuer)
        .WithEnvironment("JWT__Audience", jwtAudience)

        .WithEnvironment("Mail__ServerHost", mailServerHost)
        .WithEnvironment("Mail__ServerPort", mailServerPort)
        .WithEnvironment("Mail__SenderName", mailSenderName)
        .WithEnvironment("Mail__SenderEmail", mailSenderEmail)
        .WithEnvironment("Mail__Password", mailPassword)

        .WithEnvironment("S3__AccessKey", s3AccessKey)
        .WithEnvironment("S3__SecretKey", s3SecretKey)
        .WithEnvironment("S3__Region", s3Region)
        .WithEnvironment("S3__BucketName", s3BucketName);
    
    if (useLocalGarage && garage != null) {
        backendApi.WithEnvironment("S3__Endpoint", garage.GetEndpoint("s3-api"));
    } else {
        backendApi.WithEnvironment("S3__Endpoint", s3Endpoint);
    }

    backendApi.PublishAsDockerComposeService((resource, service) => {
        service.Image = string.Empty;
        service.Build = new() {
            Context = "./src/backend",
            Dockerfile = "Dockerfile",
        };
        
        service.Ports = [
            "5127:5127",
        ];
        
        service.ExtraHosts = new() {
            ["host.docker.internal"] = "host-gateway",
        };

        service.Environment.Remove("BACKEND_IMAGE");
    });

    backendApi.WithEnvironment("OTEL_SDK_DISABLED", "true");
}

builder.Build().Run();