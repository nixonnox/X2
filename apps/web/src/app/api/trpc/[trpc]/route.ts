import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@x2/api";
import { auth } from "@x2/auth";

const handler = async (req: Request) => {
  const session = await auth();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext(session),
  });
};

export { handler as GET, handler as POST };
