using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MessagesAddSearchVector : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReadAt",
                table: "Notifications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Messages",
                type: "tsvector",
                nullable: false,
                computedColumnSql: "to_tsvector('simple', COALESCE(\"Body\", ''))",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SearchVector",
                table: "Messages",
                column: "SearchVector")
                .Annotation("Npgsql:IndexMethod", "GIN");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Messages_SearchVector",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "SearchVector",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ReadAt",
                table: "Notifications");
        }
    }
}
