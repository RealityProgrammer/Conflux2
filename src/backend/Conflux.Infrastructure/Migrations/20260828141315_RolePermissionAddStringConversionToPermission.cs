using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RolePermissionAddStringConversionToPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Permission",
                table: "RolePermissions",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Permission",
                table: "RolePermissions",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
