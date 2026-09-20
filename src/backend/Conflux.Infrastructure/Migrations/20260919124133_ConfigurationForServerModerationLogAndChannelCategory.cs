using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConfigurationForServerModerationLogAndChannelCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServerModerationLogs_CommunityServerMembers_AffectedMemberId",
                table: "ServerModerationLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_ServerModerationLogs_CommunityServerMembers_ExecutorMemberId",
                table: "ServerModerationLogs");

            migrationBuilder.AddForeignKey(
                name: "FK_ServerModerationLogs_CommunityServerMembers_AffectedMemberId",
                table: "ServerModerationLogs",
                column: "AffectedMemberId",
                principalTable: "CommunityServerMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ServerModerationLogs_CommunityServerMembers_ExecutorMemberId",
                table: "ServerModerationLogs",
                column: "ExecutorMemberId",
                principalTable: "CommunityServerMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServerModerationLogs_CommunityServerMembers_AffectedMemberId",
                table: "ServerModerationLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_ServerModerationLogs_CommunityServerMembers_ExecutorMemberId",
                table: "ServerModerationLogs");

            migrationBuilder.AddForeignKey(
                name: "FK_ServerModerationLogs_CommunityServerMembers_AffectedMemberId",
                table: "ServerModerationLogs",
                column: "AffectedMemberId",
                principalTable: "CommunityServerMembers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ServerModerationLogs_CommunityServerMembers_ExecutorMemberId",
                table: "ServerModerationLogs",
                column: "ExecutorMemberId",
                principalTable: "CommunityServerMembers",
                principalColumn: "Id");
        }
    }
}
