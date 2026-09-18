using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CommunityServerRolesAddCreatorUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatorUserId",
                table: "CommunityServerRoles",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_CommunityServerRoles_CreatorUserId",
                table: "CommunityServerRoles",
                column: "CreatorUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServerRoles_AspNetUsers_CreatorUserId",
                table: "CommunityServerRoles",
                column: "CreatorUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServerRoles_AspNetUsers_CreatorUserId",
                table: "CommunityServerRoles");

            migrationBuilder.DropIndex(
                name: "IX_CommunityServerRoles_CreatorUserId",
                table: "CommunityServerRoles");

            migrationBuilder.DropColumn(
                name: "CreatorUserId",
                table: "CommunityServerRoles");
        }
    }
}
