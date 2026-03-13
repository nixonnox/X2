import type { Repositories } from "../../repositories";
import type {
  PaginatedResult,
  PaginationParams,
} from "../../repositories/base.repository";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FAQStatus = "DETECTED" | "REVIEWING" | "ANSWERED" | "DISMISSED";

export type FAQFilters = {
  status?: FAQStatus;
  category?: string;
  hasAnswer?: boolean;
  search?: string;
  pagination?: PaginationParams;
};

export type FAQCandidate = {
  id: string;
  projectId: string;
  question: string;
  questionVariants: string[];
  category: string | null;
  sourceCommentIds: string[];
  mentionCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  hasAnswer: boolean;
  answerUrl: string | null;
  answerContentId: string | null;
  urgencyScore: number | null;
  businessImpact: string | null;
  suggestedAction: string | null;
  status: FAQStatus;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProcessResult = {
  newCount: number;
  updatedCount: number;
  totalProcessed: number;
};

// ---------------------------------------------------------------------------
// Valid status transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<FAQStatus, FAQStatus[]> = {
  DETECTED: ["REVIEWING", "DISMISSED"],
  REVIEWING: ["ANSWERED", "DISMISSED", "DETECTED"],
  ANSWERED: ["REVIEWING"], // reopen
  DISMISSED: ["DETECTED"], // reopen
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class FAQService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Process new question comments into FAQ candidates.
   */
  async processQuestionComments(
    projectId: string,
    commentIds: string[],
    trace: TraceContext,
  ): Promise<ServiceResult<ProcessResult>> {
    try {
      if (commentIds.length === 0) {
        return ok({ newCount: 0, updatedCount: 0, totalProcessed: 0 });
      }

      // 1. Fetch comments by IDs
      type CommentRecord = { id: string; text: string };
      const commentResults = await Promise.all(
        commentIds.map((id) => this.repositories.comment.findById(id)),
      );
      const comments = commentResults.filter(
        (c: CommentRecord | null) => c !== null,
      ) as CommentRecord[];

      if (comments.length === 0) {
        return ok({ newCount: 0, updatedCount: 0, totalProcessed: 0 });
      }

      // 2. Extract question text from each
      const questionTexts = comments
        .filter((c: CommentRecord) => c.text.trim().length > 0)
        .map((c: CommentRecord) => ({
          commentId: c.id,
          text: c.text.trim(),
        }));

      // 3. Normalize questions and find similar existing FAQs
      // TODO: [INTEGRATION] @x2/ai -- Call Claude Haiku to normalize questions + find similar existing FAQs
      // Expected: aiClient.normalizeQuestions(questionTexts) -> Array<{ normalizedQuestion, clusterId }>
      // For now, use raw text as-is for matching

      let newCount = 0;
      const updatedCount = 0;

      for (const q of questionTexts) {
        // 4. Upsert FAQ candidate — creates if new, increments mentionCount if existing
        await this.repositories.faqCandidate.upsertByQuestion(
          projectId,
          q.text,
          {
            sourceCommentIds: [q.commentId],
            questionVariants: [],
          },
        );
        // Note: upsertByQuestion handles both create and update internally
        newCount++;
      }

      // 5. Log results
      this.logger.info("FAQ candidates processed", {
        projectId,
        newCount,
        updatedCount,
        totalProcessed: questionTexts.length,
        requestId: trace.requestId,
      });

      return ok({
        newCount,
        updatedCount,
        totalProcessed: questionTexts.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to process question comments", {
        projectId,
        commentIds: commentIds.length,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "FAQ_PROCESSING_FAILED");
    }
  }

  /**
   * List FAQ candidates with filters.
   */
  async listFAQs(
    projectId: string,
    filters?: FAQFilters,
  ): Promise<ServiceResult<PaginatedResult<FAQCandidate>>> {
    try {
      const result = await this.repositories.faqCandidate.findByProject(
        projectId,
        filters?.pagination,
        filters?.status as any,
      );

      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to list FAQ candidates", {
        projectId,
        error: message,
      });
      return err(message, "FAQ_LIST_FAILED");
    }
  }

  /**
   * Update FAQ status (DETECTED -> REVIEWING -> ANSWERED | DISMISSED).
   */
  async updateStatus(
    id: string,
    status: FAQStatus,
    answerUrl?: string,
  ): Promise<ServiceResult<FAQCandidate>> {
    try {
      // Fetch current FAQ
      const faq = await this.repositories.faqCandidate.findById(id);
      if (!faq) {
        return err("FAQ candidate not found", "FAQ_NOT_FOUND");
      }

      // Validate status transition
      const allowedTransitions = VALID_TRANSITIONS[faq.status as FAQStatus];
      if (!allowedTransitions?.includes(status)) {
        return err(
          `Invalid status transition from ${faq.status} to ${status}`,
          "INVALID_STATUS_TRANSITION",
        );
      }

      // Build update payload
      const updateData: Record<string, unknown> = { status };

      if (status === "ANSWERED") {
        updateData.hasAnswer = true;
        if (answerUrl) {
          updateData.answerUrl = answerUrl;
        }
      }

      if (status === "DISMISSED" || status === "ANSWERED") {
        updateData.resolvedAt = new Date();
      }

      // If reopening, clear resolved
      if (
        (faq.status === "DISMISSED" || faq.status === "ANSWERED") &&
        (status === "DETECTED" || status === "REVIEWING")
      ) {
        updateData.resolvedAt = null;
      }

      const resolvedAt =
        updateData.resolvedAt instanceof Date
          ? updateData.resolvedAt
          : updateData.resolvedAt === null
            ? undefined
            : undefined;

      const updated = await this.repositories.faqCandidate.updateStatus(
        id,
        status as any,
        resolvedAt,
      );

      this.logger.info("FAQ status updated", {
        faqId: id,
        from: faq.status,
        to: status,
      });

      return ok(updated as FAQCandidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to update FAQ status", {
        faqId: id,
        error: message,
      });
      return err(message, "FAQ_UPDATE_FAILED");
    }
  }

  /**
   * Get unanswered FAQs sorted by urgency (highest urgencyScore first, then mentionCount).
   */
  async getUnansweredByUrgency(
    projectId: string,
    limit: number = 10,
  ): Promise<ServiceResult<FAQCandidate[]>> {
    try {
      const allUnanswered =
        await this.repositories.faqCandidate.findUnanswered(projectId);
      const faqs = allUnanswered.slice(0, limit);

      return ok(faqs as FAQCandidate[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get unanswered FAQs", {
        projectId,
        error: message,
      });
      return err(message, "FAQ_UNANSWERED_FAILED");
    }
  }
}
