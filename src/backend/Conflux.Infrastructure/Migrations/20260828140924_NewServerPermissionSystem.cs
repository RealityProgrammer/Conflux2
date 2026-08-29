using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NewServerPermissionSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Permissions",
                table: "CommunityServerRoles");

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Permission = table.Column<int>(type: "integer", nullable: false),
                    State = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => new { x.RoleId, x.Permission });
                    table.ForeignKey(
                        name: "FK_RolePermissions_CommunityServerRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "CommunityServerRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.AddColumn<int>(
                name: "Permissions",
                table: "CommunityServerRoles",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
