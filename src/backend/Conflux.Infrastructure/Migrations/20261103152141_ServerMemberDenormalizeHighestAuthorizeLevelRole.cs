using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ServerMemberDenormalizeHighestAuthorizeLevelRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "HighestAuthorizeLevel",
                table: "CommunityServerMembers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "HighestAuthorizeRoleId",
                table: "CommunityServerMembers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_CommunityServerMembers_HighestAuthorizeRoleId",
                table: "CommunityServerMembers",
                column: "HighestAuthorizeRoleId");

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServerMembers_CommunityServerRoles_HighestAuthoriz~",
                table: "CommunityServerMembers",
                column: "HighestAuthorizeRoleId",
                principalTable: "CommunityServerRoles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServerMembers_CommunityServerRoles_HighestAuthoriz~",
                table: "CommunityServerMembers");

            migrationBuilder.DropIndex(
                name: "IX_CommunityServerMembers_HighestAuthorizeRoleId",
                table: "CommunityServerMembers");

            migrationBuilder.DropColumn(
                name: "HighestAuthorizeLevel",
                table: "CommunityServerMembers");

            migrationBuilder.DropColumn(
                name: "HighestAuthorizeRoleId",
                table: "CommunityServerMembers");
        }
    }
}
