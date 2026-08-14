FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ./Conflux.Domain/Conflux.Domain.csproj ./Conflux/Conflux.Domain/Conflux.Domain.csproj
COPY ./Conflux.Application/Conflux.Application.csproj ./Conflux/Conflux.Application/Conflux.Application.csproj
COPY ./Conflux.Infrastructure/Conflux.Infrastructure.csproj ./Conflux/Conflux.Infrastructure/Conflux.Infrastructure.csproj
COPY ./Conflux.WebApi/Conflux.WebApi.csproj ./Conflux/Conflux.WebApi/Conflux.WebApi.csproj

RUN dotnet restore ./Conflux/Conflux.WebApi/Conflux.WebApi.csproj

COPY ./Conflux.Domain/ ./Conflux/Conflux.Domain/
COPY ./Conflux.Application/ ./Conflux/Conflux.Application/
COPY ./Conflux.Infrastructure/ ./Conflux/Conflux.Infrastructure/
COPY ./Conflux.WebApi/ ./Conflux/Conflux.WebApi/

WORKDIR /src/Conflux/Conflux.WebApi

RUN dotnet publish ./Conflux.WebApi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 80
EXPOSE 443

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Conflux.WebApi.dll"]
