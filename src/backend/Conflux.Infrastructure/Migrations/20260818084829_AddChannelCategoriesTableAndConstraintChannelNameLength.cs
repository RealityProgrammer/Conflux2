using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChannelCategoriesTableAndConstraintChannelNameLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Channels",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ChannelCategoryId",
                table: "Channels",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CommunityServerId",
                table: "Channels",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ChannelCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CommunityServerId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChannelCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChannelCategories_CommunityServers_CommunityServerId",
                        column: x => x.CommunityServerId,
                        principalTable: "CommunityServers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Channels_ChannelCategoryId",
                table: "Channels",
                column: "ChannelCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Channels_CommunityServerId",
                table: "Channels",
                column: "CommunityServerId");

            migrationBuilder.CreateIndex(
                name: "IX_ChannelCategories_CommunityServerId",
                table: "ChannelCategories",
                column: "CommunityServerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_ChannelCategories_ChannelCategoryId",
                table: "Channels",
                column: "ChannelCategoryId",
                principalTable: "ChannelCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_CommunityServers_CommunityServerId",
                table: "Channels",
                column: "CommunityServerId",
                principalTable: "CommunityServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Channels_ChannelCategories_ChannelCategoryId",
                table: "Channels");

            migrationBuilder.DropForeignKey(
                name: "FK_Channels_CommunityServers_CommunityServerId",
                table: "Channels");

            migrationBuilder.DropTable(
                name: "ChannelCategories");

            migrationBuilder.DropIndex(
                name: "IX_Channels_ChannelCategoryId",
                table: "Channels");

            migrationBuilder.DropIndex(
                name: "IX_Channels_CommunityServerId",
                table: "Channels");

            migrationBuilder.DropColumn(
                name: "ChannelCategoryId",
                table: "Channels");

            migrationBuilder.DropColumn(
                name: "CommunityServerId",
                table: "Channels");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Channels",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32,
                oldNullable: true);
        }
    }
}
