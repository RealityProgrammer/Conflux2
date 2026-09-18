using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CommunityServerBansRemove : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommunityServerBans");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CommunityServerBans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BannedMemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExecutorMemberId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Duration = table.Column<TimeSpan>(type: "interval", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Reason = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityServerBans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommunityServerBans_CommunityServerMembers_BannedMemberId",
                        column: x => x.BannedMemberId,
                        principalTable: "CommunityServerMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CommunityServerBans_CommunityServerMembers_ExecutorMemberId",
                        column: x => x.ExecutorMemberId,
                        principalTable: "CommunityServerMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityServerBans_BannedMemberId",
                table: "CommunityServerBans",
                column: "BannedMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunityServerBans_ExecutorMemberId",
                table: "CommunityServerBans",
                column: "ExecutorMemberId");
        }
    }
}
