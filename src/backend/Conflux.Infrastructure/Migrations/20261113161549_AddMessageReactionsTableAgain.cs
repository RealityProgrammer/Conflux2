using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageReactionsTableAgain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MessageReaction_Messages_MessageId",
                table: "MessageReaction");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MessageReaction",
                table: "MessageReaction");

            migrationBuilder.RenameTable(
                name: "MessageReaction",
                newName: "MessageReactions");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MessageReactions",
                table: "MessageReactions",
                column: "MessageId");

            migrationBuilder.AddForeignKey(
                name: "FK_MessageReactions_Messages_MessageId",
                table: "MessageReactions",
                column: "MessageId",
                principalTable: "Messages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MessageReactions_Messages_MessageId",
                table: "MessageReactions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MessageReactions",
                table: "MessageReactions");

            migrationBuilder.RenameTable(
                name: "MessageReactions",
                newName: "MessageReaction");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MessageReaction",
                table: "MessageReaction",
                column: "MessageId");

            migrationBuilder.AddForeignKey(
                name: "FK_MessageReaction_Messages_MessageId",
                table: "MessageReaction",
                column: "MessageId",
                principalTable: "Messages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
