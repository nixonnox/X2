import { router } from "./trpc";
import { channelRouter } from "./routers/channel";
import { workspaceRouter } from "./routers/workspace";
import { projectRouter } from "./routers/project";
import { contentRouter } from "./routers/content";
import { commentRouter } from "./routers/comment";
import { analyticsRouter } from "./routers/analytics";
import { competitorRouter } from "./routers/competitor";
import { reportRouter } from "./routers/report";
import { insightRouter } from "./routers/insight";
import { notificationRouter } from "./routers/notification";
import { automationRouter } from "./routers/automation";
import { collectionRouter } from "./routers/collection";
import { keywordRouter } from "./routers/keyword";
import { intentRouter } from "./routers/intent";
import { verticalDocumentRouter } from "./routers/vertical-document";
import { listeningRouter } from "./routers/listening";
import { intelligenceRouter } from "./routers/intelligence";
import { usageRouter } from "./routers/usage";
import { geoAeoRouter } from "./routers/geo-aeo";

export const appRouter = router({
  workspace: workspaceRouter,
  project: projectRouter,
  channel: channelRouter,
  content: contentRouter,
  comment: commentRouter,
  analytics: analyticsRouter,
  competitor: competitorRouter,
  report: reportRouter,
  insight: insightRouter,
  notification: notificationRouter,
  automation: automationRouter,
  collection: collectionRouter,
  keyword: keywordRouter,
  intent: intentRouter,
  verticalDocument: verticalDocumentRouter,
  listening: listeningRouter,
  intelligence: intelligenceRouter,
  usage: usageRouter,
  geoAeo: geoAeoRouter,
});

export type AppRouter = typeof appRouter;
