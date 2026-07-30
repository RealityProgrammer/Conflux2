using Microsoft.Extensions.Configuration;
using System.Diagnostics.CodeAnalysis;
using Microsoft.EntityFrameworkCore.Design;

namespace Conflux.Infrastructure;

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.All)]
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext> {
    public ApplicationDbContext CreateDbContext(string[] args) {
        // Get environment
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

        // Build configuration
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .Build();

        // Build DbContext options
        var connectionString = configuration.GetConnectionString("Database");

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();

        optionsBuilder.UseNpgsql(connectionString, options => {
            options.MigrationsAssembly(GetType().Assembly);
            options.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null);
        });

        return new(optionsBuilder.Options);
    }
}