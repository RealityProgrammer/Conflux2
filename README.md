# Setup:
## Frontend

## Backend
- Configure database connection string:
    - Navigate to src/backend/Conflux.WebApi will see appsettings.Example.json, clone them and remove the environment part of the file name (appsettings.json)
    - Modify the connection string property accordingly.
- Apply database migration with command:
```command
dotnet ef database update -p ./Conflux.Infrastructure -s ./Conflux.WebApi
```
- Add database migration after modify model in Domain project:
```command
dotnet ef migrations add InitialMigration -p ./Conflux.Infrastructure -s ./Conflux.WebApi -o ./Migrations/
```
