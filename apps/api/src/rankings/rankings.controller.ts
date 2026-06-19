import { Controller, Get, Query } from "@nestjs/common";
import { rankingLeaderboardQuerySchema, success } from "@polyand/shared";
import { WalletsService } from "../wallets/wallets.service";

@Controller("rankings")
export class RankingsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get("wallets")
  async leaderboard(@Query() query: unknown) {
    const parsed = rankingLeaderboardQuerySchema.parse(query ?? {});
    const result = await this.walletsService.listWalletRankings(parsed);
    return success(result.rows, { page: parsed.page, pageSize: parsed.pageSize, total: result.total, sort: parsed.sort });
  }
}
