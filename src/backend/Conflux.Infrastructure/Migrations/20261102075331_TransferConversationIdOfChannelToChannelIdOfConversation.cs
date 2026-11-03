using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TransferConversationIdOfChannelToChannelIdOfConversation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Channels_Conversations_ConversationId",
                table: "Channels");

            migrationBuilder.DropIndex(
                name: "IX_Channels_ConversationId",
                table: "Channels");

            migrationBuilder.DropColumn(
                name: "ConversationId",
                table: "Channels");

            migrationBuilder.AddColumn<Guid>(
                name: "ChannelId",
                table: "Conversations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ChannelId",
                table: "Conversations",
                column: "ChannelId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_Channels_ChannelId",
                table: "Conversations",
                column: "ChannelId",
                principalTable: "Channels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_Channels_ChannelId",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_ChannelId",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "ChannelId",
                table: "Conversations");

            migrationBuilder.AddColumn<Guid>(
                name: "ConversationId",
                table: "Channels",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Channels_ConversationId",
                table: "Channels",
                column: "ConversationId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_Conversations_ConversationId",
                table: "Channels",
                column: "ConversationId",
                principalTable: "Conversations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
