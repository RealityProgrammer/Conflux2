using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FriendRequestNavigationToConversation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AddColumn<Guid>(
                name: "FriendRequestId",
                table: "Conversations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_FriendRequestId",
                table: "Conversations",
                column: "FriendRequestId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_FriendRequests_FriendRequestId",
                table: "Conversations",
                column: "FriendRequestId",
                principalTable: "FriendRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_FriendRequests_FriendRequestId",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_FriendRequestId",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "FriendRequestId",
                table: "Conversations");

            migrationBuilder.AddColumn<Guid>(
                name: "DirectConversationId",
                table: "FriendRequests",
                type: "uuid",
                nullable: true);

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
    }
}
