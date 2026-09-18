using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ServerModerationLogsAddCommunityServerId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CommunityServerId",
                table: "ServerModerationLogs",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_ServerModerationLogs_CommunityServerId",
                table: "ServerModerationLogs",
                column: "CommunityServerId");

            migrationBuilder.AddForeignKey(
                name: "FK_ServerModerationLogs_CommunityServers_CommunityServerId",
                table: "ServerModerationLogs",
                column: "CommunityServerId",
                principalTable: "CommunityServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServerModerationLogs_CommunityServers_CommunityServerId",
                table: "ServerModerationLogs");

            migrationBuilder.DropIndex(
                name: "IX_ServerModerationLogs_CommunityServerId",
                table: "ServerModerationLogs");

            migrationBuilder.DropColumn(
                name: "CommunityServerId",
                table: "ServerModerationLogs");
        }
    }
}
