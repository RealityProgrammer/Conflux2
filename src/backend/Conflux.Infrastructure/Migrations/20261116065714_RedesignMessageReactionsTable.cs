using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RedesignMessageReactionsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_MessageReactions",
                table: "MessageReactions");

            migrationBuilder.DropColumn(
                name: "Reactions",
                table: "MessageReactions");

            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "MessageReactions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "EmojiId",
                table: "MessageReactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IconSource",
                table: "MessageReactions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "UnicodeValue",
                table: "MessageReactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<HashSet<Guid>>(
                name: "UserIds",
                table: "MessageReactions",
                type: "uuid[]",
                nullable: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK_MessageReactions",
                table: "MessageReactions",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_EmojiId",
                table: "MessageReactions",
                column: "EmojiId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_MessageId_EmojiId",
                table: "MessageReactions",
                columns: new[] { "MessageId", "EmojiId" },
                unique: true,
                filter: "\"EmojiId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_MessageId_UnicodeValue",
                table: "MessageReactions",
                columns: new[] { "MessageId", "UnicodeValue" },
                unique: true,
                filter: "\"UnicodeValue\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_MessageReactions_Emojis_EmojiId",
                table: "MessageReactions",
                column: "EmojiId",
                principalTable: "Emojis",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MessageReactions_Emojis_EmojiId",
                table: "MessageReactions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MessageReactions",
                table: "MessageReactions");

            migrationBuilder.DropIndex(
                name: "IX_MessageReactions_EmojiId",
                table: "MessageReactions");

            migrationBuilder.DropIndex(
                name: "IX_MessageReactions_MessageId_EmojiId",
                table: "MessageReactions");

            migrationBuilder.DropIndex(
                name: "IX_MessageReactions_MessageId_UnicodeValue",
                table: "MessageReactions");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "MessageReactions");

            migrationBuilder.DropColumn(
                name: "EmojiId",
                table: "MessageReactions");

            migrationBuilder.DropColumn(
                name: "IconSource",
                table: "MessageReactions");

            migrationBuilder.DropColumn(
                name: "UnicodeValue",
                table: "MessageReactions");

            migrationBuilder.DropColumn(
                name: "UserIds",
                table: "MessageReactions");

            migrationBuilder.AddColumn<Dictionary<string, HashSet<Guid>>>(
                name: "Reactions",
                table: "MessageReactions",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK_MessageReactions",
                table: "MessageReactions",
                column: "MessageId");
        }
    }
}
