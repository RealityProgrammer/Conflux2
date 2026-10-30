using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UserAndServerRemoveMediaItemsOfAvatarAndBanner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AddColumn<int>(
                name: "AvatarVersion",
                table: "CommunityServers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BannerVersion",
                table: "CommunityServers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AvatarVersion",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BannerVersion",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvatarVersion",
                table: "CommunityServers");

            migrationBuilder.DropColumn(
                name: "BannerVersion",
                table: "CommunityServers");

            migrationBuilder.DropColumn(
                name: "AvatarVersion",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "BannerVersion",
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
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CommunityServers_MediaItems_BannerId",
                table: "CommunityServers",
                column: "BannerId",
                principalTable: "MediaItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
