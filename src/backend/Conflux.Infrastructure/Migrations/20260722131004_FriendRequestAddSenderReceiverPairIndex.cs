using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Conflux.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FriendRequestAddSenderReceiverPairIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE UNIQUE INDEX "IX_FriendRequests_SenderReceiverPair" ON "FriendRequests"
                    (LEAST("SenderUserId", "ReceiverUserId"), GREATEST("SenderUserId", "ReceiverUserId"));
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX "IX_FriendRequests_SenderReceiverPair";
                """
            );
        }
    }
}
