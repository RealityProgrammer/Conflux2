using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationUserAvatarAndBannerCascadeDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServers_MediaItems_AvatarId",
                table: "CommunityServers");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServers_MediaItems_BannerId",
                table: "CommunityServers");

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServers_MediaItems_AvatarId",
                table: "CommunityServers",
                column: "AvatarId",
                principalTable: "MediaItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServers_MediaItems_BannerId",
                table: "CommunityServers",
                column: "BannerId",
                principalTable: "MediaItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServers_MediaItems_AvatarId",
                table: "CommunityServers");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServers_MediaItems_BannerId",
                table: "CommunityServers");

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServers_MediaItems_AvatarId",
                table: "CommunityServers",
                column: "AvatarId",
                principalTable: "MediaItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServers_MediaItems_BannerId",
                table: "CommunityServers",
                column: "BannerId",
                principalTable: "MediaItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
