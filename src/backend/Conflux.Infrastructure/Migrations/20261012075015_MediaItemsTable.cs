using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MediaItemsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Attachments");

            migrationBuilder.DropColumn(
                name: "HasAvatar",
                table: "CommunityServers");

            migrationBuilder.DropColumn(
                name: "AvatarRevision",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "BannerRevision",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<Guid>(
                name: "AvatarId",
                table: "CommunityServers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BannerId",
                table: "CommunityServers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DisplayName",
                table: "AspNetUsers",
                type: "character varying(48)",
                maxLength: 48,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32,
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AvatarId",
                table: "AspNetUsers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BannerId",
                table: "AspNetUsers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MediaItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    FileName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    MessageId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaItems_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityServers_AvatarId",
                table: "CommunityServers",
                column: "AvatarId");

            migrationBuilder.CreateIndex(
                name: "IX_CommunityServers_BannerId",
                table: "CommunityServers",
                column: "BannerId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_AvatarId",
                table: "AspNetUsers",
                column: "AvatarId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_BannerId",
                table: "AspNetUsers",
                column: "BannerId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaItems_MessageId",
                table: "MediaItems",
                column: "MessageId");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_MediaItems_AvatarId",
                table: "AspNetUsers",
                column: "AvatarId",
                principalTable: "MediaItems",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_MediaItems_BannerId",
                table: "AspNetUsers",
                column: "BannerId",
                principalTable: "MediaItems",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServers_MediaItems_AvatarId",
                table: "CommunityServers",
                column: "AvatarId",
                principalTable: "MediaItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServers_MediaItems_BannerId",
                table: "CommunityServers",
                column: "BannerId",
                principalTable: "MediaItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_MediaItems_AvatarId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_MediaItems_BannerId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServers_MediaItems_AvatarId",
                table: "CommunityServers");

            migrationBuilder.DropForeignKey(
                name: "FK_CommunityServers_MediaItems_BannerId",
                table: "CommunityServers");

            migrationBuilder.DropTable(
                name: "MediaItems");

            migrationBuilder.DropIndex(
                name: "IX_CommunityServers_AvatarId",
                table: "CommunityServers");

            migrationBuilder.DropIndex(
                name: "IX_CommunityServers_BannerId",
                table: "CommunityServers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_AvatarId",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_BannerId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "AvatarId",
                table: "CommunityServers");

            migrationBuilder.DropColumn(
                name: "BannerId",
                table: "CommunityServers");

            migrationBuilder.DropColumn(
                name: "AvatarId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "BannerId",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<bool>(
                name: "HasAvatar",
                table: "CommunityServers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "DisplayName",
                table: "AspNetUsers",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(48)",
                oldMaxLength: 48,
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AvatarRevision",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BannerRevision",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Attachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Type = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Attachments_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_MessageId",
                table: "Attachments",
                column: "MessageId");
        }
    }
}
