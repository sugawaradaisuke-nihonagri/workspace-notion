import { router, publicProcedure } from "../init";
import { workspaceRouter } from "./workspace";
import { pagesRouter } from "./pages";
import { blocksRouter } from "./blocks";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { status: "ok" };
  }),
  workspace: workspaceRouter,
  pages: pagesRouter,
  blocks: blocksRouter,
});

export type AppRouter = typeof appRouter;
