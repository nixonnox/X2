import type {
  PrismaClient,
  Workspace,
  WorkspaceMember,
  Project,
  WorkspaceRole,
  Prisma,
} from "@prisma/client";
import { BaseRepository } from "./base.repository";

/** Subset of workspace fields representing plan-imposed limits. */
export type WorkspaceCapabilities = {
  maxChannels: number;
  maxContentsPerMonth: number;
  maxCommentsPerMonth: number;
  maxAiTokensPerDay: number;
  maxMembers: number;
  maxReportsPerMonth: number;
  canExportData: boolean;
  canAccessApi: boolean;
  maxVerticalPacks: number;
  geoAeoEnabled: boolean;
  influencerExecutionEnabled: boolean;
  evidenceReportingEnabled: boolean;
};

/**
 * Repository for Workspace, WorkspaceMember, and Project models.
 * Manages multi-tenant workspace CRUD, membership, and plan capability queries.
 */
export class WorkspaceRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Find a workspace by ID with member count.
   */
  async findById(id: string) {
    return this.prisma.workspace.findUnique({
      where: { id },
      include: { _count: { select: { members: true, projects: true } } },
    });
  }

  /**
   * Find a workspace by its unique slug.
   */
  async findBySlug(slug: string) {
    return this.prisma.workspace.findUnique({
      where: { slug },
      include: { _count: { select: { members: true, projects: true } } },
    });
  }

  /**
   * Find all workspaces a user belongs to.
   */
  async findByUser(userId: string): Promise<Workspace[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });
    return memberships.map((m: { workspace: Workspace }) => m.workspace);
  }

  /**
   * Create a new workspace and add the creator as OWNER.
   */
  async create(data: Prisma.WorkspaceCreateInput, ownerId: string) {
    return this.prisma.workspace.create({
      data: {
        ...data,
        members: {
          create: { userId: ownerId, role: "OWNER" },
        },
      },
      include: { members: true },
    });
  }

  /**
   * Update workspace fields including capability/plan limit overrides.
   */
  async update(id: string, data: Prisma.WorkspaceUpdateInput) {
    return this.prisma.workspace.update({ where: { id }, data });
  }

  /**
   * List all members of a workspace with user details.
   */
  async findMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  /**
   * Add a user to a workspace with a given role.
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = "MEMBER",
  ) {
    return this.prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
    });
  }

  /**
   * Remove a user from a workspace.
   */
  async removeMember(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
  }

  /**
   * Update a workspace member's role.
   */
  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ) {
    return this.prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId, workspaceId } },
      data: { role },
    });
  }

  /**
   * List all projects within a workspace.
   */
  async findProjects(workspaceId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create a new project within a workspace.
   */
  async createProject(
    workspaceId: string,
    data: Omit<Prisma.ProjectCreateInput, "workspace">,
  ) {
    return this.prisma.project.create({
      data: {
        ...data,
        workspace: { connect: { id: workspaceId } },
      },
    });
  }

  /**
   * Get the plan-imposed capability fields for a workspace.
   */
  async getCapabilities(
    workspaceId: string,
  ): Promise<WorkspaceCapabilities | null> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        maxChannels: true,
        maxContentsPerMonth: true,
        maxCommentsPerMonth: true,
        maxAiTokensPerDay: true,
        maxMembers: true,
        maxReportsPerMonth: true,
        canExportData: true,
        canAccessApi: true,
        maxVerticalPacks: true,
        geoAeoEnabled: true,
        influencerExecutionEnabled: true,
        evidenceReportingEnabled: true,
      },
    });
    return ws;
  }

  /**
   * Count total channels across all projects in a workspace (for limit checking).
   */
  async countChannels(workspaceId: string): Promise<number> {
    return this.prisma.channel.count({
      where: {
        project: { workspaceId },
        deletedAt: null,
      },
    });
  }

  /**
   * Count total members in a workspace (for limit checking).
   */
  async countMembers(workspaceId: string): Promise<number> {
    return this.prisma.workspaceMember.count({
      where: { workspaceId },
    });
  }
}
