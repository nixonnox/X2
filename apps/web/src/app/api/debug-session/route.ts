import { NextResponse } from "next/server";
import { auth } from "@x2/auth";
import { db } from "@x2/db";

export async function GET() {
  const session = await auth();

  let workspaces: any[] = [];
  let memberships: any[] = [];

  if (session?.user?.id) {
    memberships = await db.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: { workspace: { include: { projects: true } } },
    });
    workspaces = memberships.map((m) => ({
      wsId: m.workspace.id,
      wsName: m.workspace.name,
      role: m.role,
      projects: m.workspace.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
      })),
    }));
  }

  return NextResponse.json({
    session: session
      ? {
          userId: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
        }
      : null,
    workspaceCount: workspaces.length,
    workspaces,
  });
}
