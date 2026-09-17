using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationUserRenameIsProfileSetupToIsUserNameLocked : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsProfileSetup",
                table: "AspNetUsers",
                newName: "IsUserNameLocked");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsUserNameLocked",
                table: "AspNetUsers",
                newName: "IsProfileSetup");
        }
    }
}
