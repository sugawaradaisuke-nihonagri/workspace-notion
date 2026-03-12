import { router, publicProcedure } from "../init";
import { workspaceRouter } from "./workspace";
import { pagesRouter } from "./pages";
import { blocksRouter } from "./blocks";
import { databasePropertiesRouter } from "./database-properties";
import { databaseRowsRouter } from "./database-rows";
import { databaseViewsRouter } from "./database-views";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { status: "ok" };
  }),
  workspace: workspaceRouter,
  pages: pagesRouter,
  blocks: blocksRouter,
  dbProperties: databasePropertiesRouter,
  dbRows: databaseRowsRouter,
  dbViews: databaseViewsRouter,
});

export type AppRouter = typeof appRouter;
