using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ChannelCategorySetNullChannelOnDeleted : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Channels_ChannelCategories_ChannelCategoryId",
                table: "Channels");

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_ChannelCategories_ChannelCategoryId",
                table: "Channels",
                column: "ChannelCategoryId",
                principalTable: "ChannelCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Channels_ChannelCategories_ChannelCategoryId",
                table: "Channels");

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_ChannelCategories_ChannelCategoryId",
                table: "Channels",
                column: "ChannelCategoryId",
                principalTable: "ChannelCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
