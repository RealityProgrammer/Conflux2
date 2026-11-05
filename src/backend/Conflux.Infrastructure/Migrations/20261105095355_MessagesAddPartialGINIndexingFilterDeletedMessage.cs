using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MessagesAddPartialGINIndexingFilterDeletedMessage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Messages_SearchVector",
                table: "Messages");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SearchVector",
                table: "Messages",
                column: "SearchVector",
                filter: "\"DeletedAt\" IS NULL")
                .Annotation("Npgsql:IndexMethod", "GIN");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Messages_SearchVector",
                table: "Messages");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SearchVector",
                table: "Messages",
                column: "SearchVector")
                .Annotation("Npgsql:IndexMethod", "GIN");
        }
    }
}
