using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServerModerationLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServerModerationLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExecutorMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    AffectedMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServerModerationLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServerModerationLogs_CommunityServerMembers_AffectedMemberId",
                        column: x => x.AffectedMemberId,
                        principalTable: "CommunityServerMembers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ServerModerationLogs_CommunityServerMembers_ExecutorMemberId",
                        column: x => x.ExecutorMemberId,
                        principalTable: "CommunityServerMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServerModerationLogs_AffectedMemberId",
                table: "ServerModerationLogs",
                column: "AffectedMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_ServerModerationLogs_ExecutorMemberId",
                table: "ServerModerationLogs",
                column: "ExecutorMemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ServerModerationLogs");
        }
    }
}
