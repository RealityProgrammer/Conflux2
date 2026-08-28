using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CommunityServerRoleAddAuthorizeLevelAndSpecialRoleType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AuthorizeLevel",
                table: "CommunityServerRoles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<byte>(
                name: "SpecialRoleType",
                table: "CommunityServerRoles",
                type: "smallint",
                nullable: false,
                defaultValue: (byte)0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AuthorizeLevel",
                table: "CommunityServerRoles");

            migrationBuilder.DropColumn(
                name: "SpecialRoleType",
                table: "CommunityServerRoles");
        }
    }
}
