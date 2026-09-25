# Setup:
## Frontend

## Backend

### Common
- Non-sensitive information (media size, time, duration, etc...) are stored in appsettings.json
- For sensitive information (API keys, secrets, ...), create a .env file at the root of WebApi project.
- You can moves all properties from appsettings.json to .env, but read Microsoft's documentation on how keys are formatted.

### Database
- Modify the database connection string.

```command
dotnet ef database update -p ./Conflux.Infrastructure -s ./Conflux.WebApi
```
- Add database migration after modify model in Domain project:
```command
dotnet ef migrations add InitialMigration -p ./Conflux.Infrastructure -s ./Conflux.WebApi -o ./Migrations/
```

### Cache
- Modify the connection string to Redis or Valkey (pay attention to the key value).

### Blob storage (S3/Garage)
- Setup Garage or AWS S3.
