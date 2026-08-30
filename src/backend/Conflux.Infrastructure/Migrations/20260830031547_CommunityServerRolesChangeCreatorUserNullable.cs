using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CommunityServerRolesChangeCreatorUserNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServerRoles_AspNetUsers_CreatorUserId",
                table: "CommunityServerRoles");

            migrationBuilder.AlterColumn<Guid>(
                name: "CreatorUserId",
                table: "CommunityServerRoles",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServerRoles_AspNetUsers_CreatorUserId",
                table: "CommunityServerRoles",
                column: "CreatorUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServerRoles_AspNetUsers_CreatorUserId",
                table: "CommunityServerRoles");

            migrationBuilder.AlterColumn<Guid>(
                name: "CreatorUserId",
                table: "CommunityServerRoles",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServerRoles_AspNetUsers_CreatorUserId",
                table: "CommunityServerRoles",
                column: "CreatorUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }
    }
}
