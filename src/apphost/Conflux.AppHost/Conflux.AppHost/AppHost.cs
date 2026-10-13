using Microsoft.Extensions.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var jwtSecret = builder.AddParameter("JWT-Secret", true);
var jwtIssuer = builder.AddParameter("JWT-Issuer");
var jwtAudience = builder.AddParameter("JWT-Audience");

var frontendOrigin = builder.AddParameter("Frontend-Origin");
var accessTokenDuration = builder.AddParameter("Auth-Access-Token-Duration");
var refreshTokenDuration = builder.AddParameter("Auth-Refresh-Token-Duration");
var maxAvatarSize = builder.AddParameter("Media-Max-Avatar-Size");
var maxBannerSize = builder.AddParameter("Media-Max-Banner-Size");
var maxMessageAttachmentSize = builder.AddParameter("Media-Max-Message-Attachment-Size");

var s3AccessKey = builder.AddParameter("S3-Access-Key", true);
var s3SecretKey = builder.AddParameter("S3-Secret-Key", true);
var s3Region = builder.AddParameter("S3-Region", true);
var s3BucketName = builder.AddParameter("S3-Bucket-Name", true);

var mailServerHost = builder.AddParameter("Mail-Server-Host");
var mailServerPort = builder.AddParameter("Mail-Server-Port");
var mailSenderName = builder.AddParameter("Mail-Sender-Name");
var mailSenderEmail = builder.AddParameter("Mail-Sender-Email");
var mailPassword = builder.AddParameter("Mail-Password");

builder.AddDockerComposeEnvironment("compose")
    .WithDashboard(builder.Environment.IsDevelopment());

var cache = builder
    .AddValkey("Valkey")
    .WithImageTag("alpine")
    .WithLifetime(ContainerLifetime.Persistent);

var database = builder
    .AddPostgres("Database")
    .WithImageTag("alpine")
    .WithLifetime(ContainerLifetime.Persistent);

database.AddDatabase("conflux");

var garage = builder
    .AddContainer("garage", "dxflrs/garage", "v2.3.0")
    .WithHttpEndpoint(3900, 3900, "s3-api")
    .WithVolume("garage-data", "/var/lib/garage/data");

var backendApi = builder
    .AddContainer("backend", "placeholder")
    .WithHttpEndpoint(port: 5127, targetPort: 5127, name: "http")
    .WithReference(database)
    .WithReference(cache)
    .WaitFor(database);

backendApi
    .WithEnvironment("Frontend__Origin", frontendOrigin)
    .WithEnvironment("Auth__AccessTokenDuration", accessTokenDuration)
    .WithEnvironment("Auth__RefreshTokenDuration", refreshTokenDuration)
    .WithEnvironment("Media__MaxAvatarSize", maxAvatarSize)
    .WithEnvironment("Media__MaxBannerSize", maxBannerSize)
    .WithEnvironment("Media__MaxMessageAttachmentSize", maxMessageAttachmentSize)
    
    .WithEnvironment("JWT__Secret", jwtSecret)
    .WithEnvironment("JWT__Issuer", jwtIssuer)
    .WithEnvironment("JWT__Audience", jwtAudience)
    
    .WithEnvironment("S3__Endpoint", garage.GetEndpoint("s3-api"))
    .WithEnvironment("S3__AccessKey", s3AccessKey)
    .WithEnvironment("S3__SecretKey", s3SecretKey)
    .WithEnvironment("S3__Region", s3Region)
    .WithEnvironment("S3__BucketName", s3BucketName)
    
    .WithEnvironment("Mail__ServerHost", mailServerHost)
    .WithEnvironment("Mail__ServerPort", mailServerPort)
    .WithEnvironment("Mail__SenderName", mailSenderName)
    .WithEnvironment("Mail__SenderEmail", mailSenderEmail)
    .WithEnvironment("Mail__Password", mailPassword);

backendApi.PublishAsDockerComposeService((resource, service) => {
    service.Image = string.Empty;
    service.Build = new() {
        Context = "../../../backend",
        Dockerfile = "Dockerfile",
    };
});

backendApi.WithEnvironment("OTEL_SDK_DISABLED", "true");

builder.Build().Run();