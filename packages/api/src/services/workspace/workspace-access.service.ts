import type { Repositories } from "../../repositories";
import { type ServiceResult, type Logger, ok, err } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccessCheck = {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  upgradeRequired: boolean;
  reason?: string;
};

export type FeatureFlag =
  | "canExportData"
  | "canAccessApi"
  | "geoAeoEnabled"
  | "competitorTrackingEnabled"
  | "customReportsEnabled"
  | "whiteLabel";

export type WorkspaceCapabilities = {
  workspaceId: string;
  plan: string;
  maxChannels: number;
  maxMembers: number;
  maxProjects: number;
  maxAiTokensPerDay: number;
  maxReportsPerMonth: number;
  canExportData: boolean;
  canAccessApi: boolean;
  geoAeoEnabled: boolean;
  competitorTrackingEnabled: boolean;
  customReportsEnabled: boolean;
  whiteLabel: boolean;
};

// Plan capability definitions
const PLAN_CAPABILITIES: Record<
  string,
  Omit<WorkspaceCapabilities, "workspaceId" | "plan">
> = {
  FREE: {
    maxChannels: 3,
    maxMembers: 2,
    maxProjects: 1,
    maxAiTokensPerDay: 10_000,
    maxReportsPerMonth: 5,
    canExportData: false,
    canAccessApi: false,
    geoAeoEnabled: false,
    competitorTrackingEnabled: false,
    customReportsEnabled: false,
    whiteLabel: false,
  },
  STARTER: {
    maxChannels: 10,
    maxMembers: 5,
    maxProjects: 3,
    maxAiTokensPerDay: 50_000,
    maxReportsPerMonth: 20,
    canExportData: true,
    canAccessApi: false,
    geoAeoEnabled: false,
    competitorTrackingEnabled: true,
    customReportsEnabled: false,
    whiteLabel: false,
  },
  PRO: {
    maxChannels: 50,
    maxMembers: 20,
    maxProjects: 10,
    maxAiTokensPerDay: 200_000,
    maxReportsPerMonth: 100,
    canExportData: true,
    canAccessApi: true,
    geoAeoEnabled: true,
    competitorTrackingEnabled: true,
    customReportsEnabled: true,
    whiteLabel: false,
  },
  ENTERPRISE: {
    maxChannels: 999,
    maxMembers: 999,
    maxProjects: 999,
    maxAiTokensPerDay: 1_000_000,
    maxReportsPerMonth: 999,
    canExportData: true,
    canAccessApi: true,
    geoAeoEnabled: true,
    competitorTrackingEnabled: true,
    customReportsEnabled: true,
    whiteLabel: true,
  },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class WorkspaceAccessService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if workspace can add more channels.
   */
  async canAddChannel(
    workspaceId: string,
  ): Promise<ServiceResult<AccessCheck>> {
    try {
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      const maxChannels =
        workspace.maxChannels ?? PLAN_CAPABILITIES["FREE"]!.maxChannels;
      const currentChannels =
        await this.repositories.workspace.countChannels(workspaceId);

      const remaining = Math.max(0, maxChannels - currentChannels);

      return ok({
        allowed: currentChannels < maxChannels,
        current: currentChannels,
        limit: maxChannels,
        remaining,
        upgradeRequired: currentChannels >= maxChannels,
        reason:
          currentChannels >= maxChannels
            ? `Channel limit reached (${currentChannels}/${maxChannels}). Upgrade your plan for more channels.`
            : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to check channel access", {
        workspaceId,
        error: message,
      });
      return err(message, "ACCESS_CHECK_FAILED");
    }
  }

  /**
   * Check if workspace can add more members.
   */
  async canAddMember(workspaceId: string): Promise<ServiceResult<AccessCheck>> {
    try {
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      const maxMembers =
        workspace.maxMembers ?? PLAN_CAPABILITIES["FREE"]!.maxMembers;
      const currentMembers =
        await this.repositories.workspace.countMembers(workspaceId);

      const remaining = Math.max(0, maxMembers - currentMembers);

      return ok({
        allowed: currentMembers < maxMembers,
        current: currentMembers,
        limit: maxMembers,
        remaining,
        upgradeRequired: currentMembers >= maxMembers,
        reason:
          currentMembers >= maxMembers
            ? `Member limit reached (${currentMembers}/${maxMembers}). Upgrade your plan for more members.`
            : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to check member access", {
        workspaceId,
        error: message,
      });
      return err(message, "ACCESS_CHECK_FAILED");
    }
  }

  /**
   * Check if workspace has AI tokens remaining today.
   */
  async canUseAiTokens(
    workspaceId: string,
    estimatedTokens: number,
  ): Promise<ServiceResult<AccessCheck>> {
    try {
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      const maxTokens =
        workspace.maxAiTokensPerDay ??
        PLAN_CAPABILITIES["FREE"]!.maxAiTokensPerDay;

      // Get today's usage
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const usage = await this.repositories.usage.getTodayUsage(workspaceId);

      const currentTokens = usage?.aiTokensUsed ?? 0;
      const remaining = Math.max(0, maxTokens - currentTokens);

      return ok({
        allowed: remaining >= estimatedTokens,
        current: currentTokens,
        limit: maxTokens,
        remaining,
        upgradeRequired: remaining < estimatedTokens,
        reason:
          remaining < estimatedTokens
            ? `Insufficient AI tokens. Need ${estimatedTokens}, remaining ${remaining}/${maxTokens}.`
            : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to check AI token access", {
        workspaceId,
        error: message,
      });
      return err(message, "ACCESS_CHECK_FAILED");
    }
  }

  /**
   * Check feature flag.
   */
  async isFeatureEnabled(
    workspaceId: string,
    feature: FeatureFlag,
  ): Promise<ServiceResult<boolean>> {
    try {
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      // Check feature flag from workspace capabilities
      const enabled = !!(workspace as any)[feature];

      return ok(enabled);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to check feature flag", {
        workspaceId,
        feature,
        error: message,
      });
      return err(message, "FEATURE_CHECK_FAILED");
    }
  }

  /**
   * Get full workspace capabilities.
   */
  async getCapabilities(
    workspaceId: string,
  ): Promise<ServiceResult<WorkspaceCapabilities>> {
    try {
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      const plan = workspace.plan ?? "FREE";
      const defaults = PLAN_CAPABILITIES[plan] ?? PLAN_CAPABILITIES.FREE!;

      return ok({
        workspaceId,
        plan,
        maxChannels: workspace.maxChannels ?? defaults.maxChannels,
        maxMembers: workspace.maxMembers ?? defaults.maxMembers,
        maxProjects: workspace.maxProjects ?? defaults.maxProjects,
        maxAiTokensPerDay:
          workspace.maxAiTokensPerDay ?? defaults.maxAiTokensPerDay,
        maxReportsPerMonth:
          workspace.maxReportsPerMonth ?? defaults.maxReportsPerMonth,
        canExportData: workspace.canExportData ?? defaults.canExportData,
        canAccessApi: workspace.canAccessApi ?? defaults.canAccessApi,
        geoAeoEnabled: workspace.geoAeoEnabled ?? defaults.geoAeoEnabled,
        competitorTrackingEnabled:
          workspace.competitorTrackingEnabled ??
          defaults.competitorTrackingEnabled,
        customReportsEnabled:
          workspace.customReportsEnabled ?? defaults.customReportsEnabled,
        whiteLabel: workspace.whiteLabel ?? defaults.whiteLabel,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get capabilities", {
        workspaceId,
        error: message,
      });
      return err(message, "CAPABILITIES_FAILED");
    }
  }

  /**
   * Sync capabilities from plan (after plan change).
   */
  async syncCapabilitiesFromPlan(
    workspaceId: string,
    plan: string,
  ): Promise<ServiceResult<void>> {
    try {
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      const capabilities = PLAN_CAPABILITIES[plan];
      if (!capabilities) {
        return err(`Unknown plan: ${plan}`, "INVALID_PLAN");
      }

      // Update all capability fields based on plan
      await this.repositories.workspace.update(workspaceId, {
        plan,
        maxChannels: capabilities.maxChannels,
        maxMembers: capabilities.maxMembers,
        maxProjects: capabilities.maxProjects,
        maxAiTokensPerDay: capabilities.maxAiTokensPerDay,
        maxReportsPerMonth: capabilities.maxReportsPerMonth,
        canExportData: capabilities.canExportData,
        canAccessApi: capabilities.canAccessApi,
        geoAeoEnabled: capabilities.geoAeoEnabled,
        competitorTrackingEnabled: capabilities.competitorTrackingEnabled,
        customReportsEnabled: capabilities.customReportsEnabled,
        whiteLabel: capabilities.whiteLabel,
      });

      this.logger.info("Workspace capabilities synced from plan", {
        workspaceId,
        plan,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to sync capabilities", {
        workspaceId,
        plan,
        error: message,
      });
      return err(message, "CAPABILITIES_SYNC_FAILED");
    }
  }
}
