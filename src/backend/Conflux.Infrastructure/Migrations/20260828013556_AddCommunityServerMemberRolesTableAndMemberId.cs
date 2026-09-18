using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunityServerMemberRolesTableAndMemberId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_CommunityServerMembers",
                table: "CommunityServerMembers");

            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "CommunityServerMembers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_CommunityServerMembers",
                table: "CommunityServerMembers",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "CommunityServerMemberRoles",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityServerMemberRoles", x => new { x.MemberId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_CommunityServerMemberRoles_CommunityServerMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "CommunityServerMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CommunityServerMemberRoles_CommunityServerRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "CommunityServerRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityServerMembers_UserId",
                table: "CommunityServerMembers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunityServerMemberRoles_RoleId",
                table: "CommunityServerMemberRoles",
                column: "RoleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommunityServerMemberRoles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CommunityServerMembers",
                table: "CommunityServerMembers");

            migrationBuilder.DropIndex(
                name: "IX_CommunityServerMembers_UserId",
                table: "CommunityServerMembers");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "CommunityServerMembers");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CommunityServerMembers",
                table: "CommunityServerMembers",
                columns: new[] { "UserId", "CommunityServerId" });
        }
    }
}
