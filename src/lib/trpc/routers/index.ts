import { router, publicProcedure } from "../init";
import { workspaceRouter } from "./workspace";
import { pagesRouter } from "./pages";
import { blocksRouter } from "./blocks";
import { databasePropertiesRouter } from "./database-properties";
import { databaseRowsRouter } from "./database-rows";
import { databaseViewsRouter } from "./database-views";
import { commentsRouter } from "./comments";
import { pageSharesRouter } from "./page-shares";
import { favoritesRouter } from "./favorites";
import { notificationsRouter } from "./notifications";
import { pageVersionsRouter } from "./page-versions";

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
  comments: commentsRouter,
  pageShares: pageSharesRouter,
  favorites: favoritesRouter,
  notifications: notificationsRouter,
  pageVersions: pageVersionsRouter,
});

export type AppRouter = typeof appRouter;
