using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EmojisTableAddCreatorId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatorId",
                table: "Emojis",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Emojis_CreatorId",
                table: "Emojis",
                column: "CreatorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Emojis_AspNetUsers_CreatorId",
                table: "Emojis",
                column: "CreatorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Emojis_AspNetUsers_CreatorId",
                table: "Emojis");

            migrationBuilder.DropIndex(
                name: "IX_Emojis_CreatorId",
                table: "Emojis");

            migrationBuilder.DropColumn(
                name: "CreatorId",
                table: "Emojis");
        }
    }
}
