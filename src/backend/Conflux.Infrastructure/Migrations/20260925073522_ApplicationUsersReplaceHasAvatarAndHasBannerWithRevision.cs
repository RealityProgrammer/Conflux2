using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationUsersReplaceHasAvatarAndHasBannerWithRevision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasAvatar",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "HasBanner",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<int>(
                name: "AvatarRevision",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BannerRevision",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvatarRevision",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "BannerRevision",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<bool>(
                name: "HasAvatar",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasBanner",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
