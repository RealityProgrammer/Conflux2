using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReconfigurateConversationAndFriendRequestNavigationProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Channels_FriendRequests_FriendRequestId",
                table: "Channels");

            migrationBuilder.DropIndex(
                name: "IX_Channels_FriendRequestId",
                table: "Channels");

            migrationBuilder.DropColumn(
                name: "FriendRequestId",
                table: "Channels");

            migrationBuilder.AddColumn<Guid>(
                name: "DirectConversationId",
                table: "FriendRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Conversations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_FriendRequests_DirectConversationId",
                table: "FriendRequests",
                column: "DirectConversationId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_FriendRequests_Conversations_DirectConversationId",
                table: "FriendRequests",
                column: "DirectConversationId",
                principalTable: "Conversations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FriendRequests_Conversations_DirectConversationId",
                table: "FriendRequests");

            migrationBuilder.DropIndex(
                name: "IX_FriendRequests_DirectConversationId",
                table: "FriendRequests");

            migrationBuilder.DropColumn(
                name: "DirectConversationId",
                table: "FriendRequests");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Conversations");

            migrationBuilder.AddColumn<Guid>(
                name: "FriendRequestId",
                table: "Channels",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Channels_FriendRequestId",
                table: "Channels",
                column: "FriendRequestId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_FriendRequests_FriendRequestId",
                table: "Channels",
                column: "FriendRequestId",
                principalTable: "FriendRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
