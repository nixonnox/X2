import type { PrismaClient } from "@prisma/client";
import type { Repositories } from "../repositories";
import type { Logger } from "./types";
import { consoleLogger } from "./types";
export {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
  consoleLogger,
} from "./types";
export { assessSearchDataQuality } from "./search-intelligence/search-data-quality";
export type {
  SearchIntelligenceResult as SearchIntelligenceResultInput,
  SearchDataQualityAssessment,
  RoleContext as SearchRoleContext,
} from "./search-intelligence/types";
export type {
  DocumentBlock,
  ReportOutputSection,
  PtSlideBlock,
  GeneratedDocumentOutput,
  DocumentRole,
  DocumentUseCase,
  ReportOutputType,
} from "./documents/types";
export type {
  PtDeck,
  PtDeckType,
  PtNarrative,
  PtAudience,
  PtAudienceConfig,
  RecommendedVisualType,
} from "./pt/types";
export type { GeneratePtDeckInput } from "./pt/pt-deck-generation.service";
export type {
  WorkDoc,
  WorkDocType,
  WorkDocAudience,
  WorkDocSection,
  WorkDocSentenceBlock,
  WorkDocBlockType,
  SentenceTone,
  WorkDocAudienceConfig,
} from "./workdocs/types";
export type { GenerateWorkDocInput } from "./workdocs/work-report-generation.service";
export type {
  IndustryType,
  VerticalTemplate,
  VerticalDocumentProfile,
  VerticalInsightMapping,
  VerticalActionMapping,
} from "./vertical-templates/types";
export type {
  VerticalAssemblyInput,
  VerticalAssemblyResult,
} from "./vertical-templates/vertical-document-assembler";
export type { EvidencePolicyResult } from "./vertical-templates/vertical-evidence-policy";
export type { IndustrySuggestion } from "./vertical-templates/vertical-industry-suggester";
export type {
  VerticalPreview,
  VerticalComparisonPreview,
  ExportFormatPreview,
} from "./vertical-templates/vertical-preview-builder";
export type {
  VerticalDocumentGenerationInput,
  VerticalDocumentGenerationResult,
  VerticalDocumentOutputType,
  VerticalExportInput,
  VerticalComparisonInput,
} from "./vertical-templates/vertical-document-integration.service";
export type {
  VerticalComparisonData,
  IndustryResult,
  HighlightedDifference,
} from "./vertical-templates/vertical-comparison-assembler";
export type {
  DifferenceHighlightResult,
  ComparisonSection,
} from "./vertical-templates/vertical-difference-highlighter";
export type {
  VerticalPreviewInput,
  VerticalPreviewResult,
} from "./vertical-templates/vertical-preview.service";
export type {
  VerticalPreviewViewModel,
  VerticalPreviewScreenState,
  VerticalComparisonRowViewModel,
} from "./vertical-templates/vertical-preview-viewmodel-builder";
export type {
  ClusterInput as TaxonomyClusterInput,
  TaxonomyMappingResult,
  ClusterTaxonomyMapping,
} from "./vertical-templates/topic-taxonomy-mapping.service";
export type {
  BenchmarkMetric,
  BenchmarkComparison,
  BenchmarkComparisonResult,
} from "./vertical-templates/benchmark-baseline.service";
export type {
  SocialCommentData,
  VerticalSocialIntegrationResult,
} from "./vertical-templates/vertical-social-comment-integration.service";
export type {
  SignalFusionInput,
  SignalFusionResult,
} from "./vertical-templates/vertical-signal-fusion.service";
export type {
  ExportFormat,
  ExportPurpose,
  ExportJob,
  ExportBundle,
  ExportWarning,
  ExportResult,
  ExportInput,
  WordDocument,
  PptPresentation,
  PdfDocument,
} from "./export/types";

export type {
  NormalizedChannel,
  NormalizedContent,
  NormalizedComment,
  NormalizedMention,
  CollectionScope,
  CollectionRunResult,
  ChannelCollectionResult,
  PlatformHealthStatus,
  CommentAnalysisInput,
  ListeningAnalysisInput,
  IntentAnalysisInput,
  GeoAeoInput,
} from "./collection/types";

// Group 1: Core analysis services
import { ChannelAnalysisService } from "./channels/channel-analysis.service";
import { CompetitorService } from "./channels/competitor.service";
import { CommentAnalysisService } from "./comments/comment-analysis.service";
import { FAQService } from "./comments/faq.service";
import { RiskSignalService } from "./comments/risk-signal.service";
import { ListeningAnalysisService } from "./listening/listening-analysis.service";
import { TrendService } from "./listening/trend.service";
import { IntentAnalysisService } from "./intent/intent-analysis.service";

// Group 2: GEO/AEO, reports, actions, influencer, workspace, ops, notifications
import { GeoAeoService } from "./geo/geo-aeo.service";
import { CitationService } from "./geo/citation.service";
import { ReportService } from "./reports/report.service";
import { EvidenceService } from "./reports/evidence.service";
import { ActionRecommendationService } from "./actions/action-recommendation.service";
import { InfluencerExecutionService } from "./influencer/influencer-execution.service";
import { CampaignService } from "./influencer/campaign.service";
import { CampaignPerformanceService } from "./influencer/campaign-performance.service";
import { WorkspaceAccessService } from "./workspace/workspace-access.service";
import { UsageService } from "./workspace/usage.service";
import { OpsMonitoringService } from "./ops/ops-monitoring.service";
import { CollectionOrchestrationService } from "./ops/collection-orchestration.service";
import { NotificationService } from "./notification/notification.service";

// Group 3: Collection pipeline (Phase 5)
import { CollectionRunner } from "./collection/collection-runner";
import { PlatformAdapter } from "./collection/platform-adapter";
import { AnalyticsInputBuilder } from "./collection/analytics-input-builder";
import { CollectionHealthTracker } from "./collection/collection-health";

// Group 5: Phase 7 — Insight, Evidence, Report Composition, Automation
import { InsightGenerationService } from "./insights/insight-generation.service";
import { InsightSummaryService } from "./insights/insight-summary.service";
import { ExecutiveSummaryService } from "./insights/executive-summary.service";
import { EvidenceBundleService } from "./evidence/evidence-bundle.service";
import { ActionRecommendationOrchestrator } from "./actions/action-recommendation-orchestrator";
import { ReportCompositionService } from "./reports/report-composition.service";
import { ReportSectionBuilder } from "./reports/report-section-builder";
import { AlertTriggerPreparationService } from "./automation/alert-trigger-preparation.service";
import { AutomationOrchestratorService } from "./automation/automationOrchestratorService";
import { ScheduleRegistryService } from "./automation/scheduleRegistryService";
import { TriggerEvaluationService } from "./automation/triggerEvaluationService";
import { AutomationExecutionLogService } from "./automation/automationExecutionLogService";
import { AutomationAccessControlService } from "./automation/automationAccessControlService";
import { DeliveryRetryService } from "./automation/deliveryRetryService";
import { ReportAutomationService } from "./automation/report/reportAutomationService";
import { AlertAutomationService } from "./automation/alert/alertAutomationService";
import { ActionFollowupService } from "./automation/action/actionFollowupService";
import { GeoRecommendationAutomationService } from "./automation/geo/geoRecommendationAutomationService";
import { CampaignFollowupAutomationService } from "./automation/campaign/campaignFollowupAutomationService";

// Group 7: Search Intelligence Integration
import { SearchInsightIntegrationService } from "./search-intelligence/search-insight-integration.service";
import { SearchActionIntegrationService } from "./search-intelligence/search-action-integration.service";
import { SearchEvidenceBundleService } from "./search-intelligence/search-evidence-bundle.service";
import { SearchReportSectionBuilder as SearchReportSectionBuilderService } from "./search-intelligence/search-report-section-builder";
import { SearchExecutiveSummaryService } from "./search-intelligence/search-executive-summary.service";

// Group 8: Document Generation (Search Intelligence → GEO/AEO, PT, Report)
import { SearchDocumentGenerationService } from "./documents/search-document-generation.service";

// Group 9: PT Deck Generation (Search Intelligence → Advertiser PT)
import { PtDeckGenerationService } from "./pt/pt-deck-generation.service";

// Group 10: Work Document Generation (Search Intelligence → 실무형 복붙/정리/보고)
import { WorkReportGenerationService } from "./workdocs/work-report-generation.service";

// Group 11: Vertical Template Engine (업종별 문서 템플릿)
import { VerticalTemplateRegistryService } from "./vertical-templates/vertical-template-registry";
import { VerticalDocumentAssembler } from "./vertical-templates/vertical-document-assembler";
import { VerticalInsightMapper } from "./vertical-templates/vertical-insight-mapper";
import { VerticalActionMapper } from "./vertical-templates/vertical-action-mapper";
import { VerticalEvidencePolicyService } from "./vertical-templates/vertical-evidence-policy";
import { VerticalIndustrySuggester } from "./vertical-templates/vertical-industry-suggester";
import { VerticalPreviewBuilder } from "./vertical-templates/vertical-preview-builder";
import { VerticalDocumentIntegrationService } from "./vertical-templates/vertical-document-integration.service";
import { VerticalComparisonAssembler } from "./vertical-templates/vertical-comparison-assembler";
import { VerticalDifferenceHighlighter } from "./vertical-templates/vertical-difference-highlighter";
import { VerticalPreviewService } from "./vertical-templates/vertical-preview.service";
import { VerticalPreviewViewModelBuilder } from "./vertical-templates/vertical-preview-viewmodel-builder";

// Group 13: Vertical Intelligence Enhancement (cluster/social/benchmark → vertical)
import { TopicTaxonomyMappingService } from "./vertical-templates/topic-taxonomy-mapping.service";
import { BenchmarkBaselineService } from "./vertical-templates/benchmark-baseline.service";
import { VerticalSocialCommentIntegrationService } from "./vertical-templates/vertical-social-comment-integration.service";
import { VerticalSignalFusionService } from "./vertical-templates/vertical-signal-fusion.service";

// Group 12: Export Format Engine (Word / PPT / PDF)
import { ExportOrchestratorService } from "./export/export-orchestrator.service";
import { ExportBlockAssembler } from "./export/export-block-assembler";
import { ExportWarningBuilder } from "./export/export-warning-builder";
import { VerticalExportPolicyService } from "./export/vertical-export-policy";
import { WordExportBuilder } from "./export/word-export-builder";
import { PptExportBuilder } from "./export/ppt-export-builder";
import { PdfExportBuilder } from "./export/pdf-export-builder";

// Group 4: Analytics engines (Phase 6)
import { TextAnalyzer } from "./engines/text-analyzer";
import { IntentClassifier } from "./engines/intent-classifier";
import { ClusterEngine } from "./engines/cluster-engine";
import { JourneyEngine } from "./engines/journey-engine";
import { CompetitorGapEngine } from "./engines/competitor-gap-engine";
import { GeoAeoScorer } from "./engines/geo-aeo-scorer";
import { ActionSynthesizer } from "./engines/action-synthesizer";
import { EngineLogger } from "./engines/engine-logger";

// Re-export service classes for individual use
export {
  // Group 1
  ChannelAnalysisService,
  CompetitorService,
  CommentAnalysisService,
  FAQService,
  RiskSignalService,
  ListeningAnalysisService,
  TrendService,
  IntentAnalysisService,
  // Group 2
  GeoAeoService,
  CitationService,
  ReportService,
  EvidenceService,
  ActionRecommendationService,
  InfluencerExecutionService,
  CampaignService,
  CampaignPerformanceService,
  WorkspaceAccessService,
  UsageService,
  OpsMonitoringService,
  CollectionOrchestrationService,
  NotificationService,
  // Group 3: Collection pipeline
  CollectionRunner,
  PlatformAdapter,
  AnalyticsInputBuilder,
  CollectionHealthTracker,
  // Group 5: Phase 7 — Intelligence output layer
  InsightGenerationService,
  InsightSummaryService,
  ExecutiveSummaryService,
  EvidenceBundleService,
  ActionRecommendationOrchestrator,
  ReportCompositionService,
  ReportSectionBuilder,
  AlertTriggerPreparationService,
  AutomationOrchestratorService,
  ScheduleRegistryService,
  TriggerEvaluationService,
  AutomationExecutionLogService,
  AutomationAccessControlService,
  DeliveryRetryService,
  ReportAutomationService,
  AlertAutomationService,
  ActionFollowupService,
  GeoRecommendationAutomationService,
  CampaignFollowupAutomationService,
  // Group 7: Search Intelligence Integration
  SearchInsightIntegrationService,
  SearchActionIntegrationService,
  SearchEvidenceBundleService,
  SearchReportSectionBuilderService,
  SearchExecutiveSummaryService,
  // Group 8: Document Generation
  SearchDocumentGenerationService,
  // Group 9: PT Deck Generation
  PtDeckGenerationService,
  // Group 10: Work Document Generation
  WorkReportGenerationService,
  // Group 11: Vertical Template Engine
  VerticalTemplateRegistryService,
  VerticalDocumentAssembler,
  VerticalInsightMapper,
  VerticalActionMapper,
  VerticalEvidencePolicyService,
  // Group 11b: Vertical Runtime Connection
  VerticalIndustrySuggester,
  VerticalPreviewBuilder,
  VerticalDocumentIntegrationService,
  // Group 11c: Vertical Preview (Task N)
  VerticalComparisonAssembler,
  VerticalDifferenceHighlighter,
  VerticalPreviewService,
  VerticalPreviewViewModelBuilder,
  // Group 13: Vertical Intelligence Enhancement
  TopicTaxonomyMappingService,
  BenchmarkBaselineService,
  VerticalSocialCommentIntegrationService,
  VerticalSignalFusionService,
  // Group 12: Export Format Engine
  ExportOrchestratorService,
  ExportBlockAssembler,
  ExportWarningBuilder,
  VerticalExportPolicyService,
  WordExportBuilder,
  PptExportBuilder,
  PdfExportBuilder,
  // Group 4: Analytics engines
  TextAnalyzer,
  IntentClassifier,
  ClusterEngine,
  JourneyEngine,
  CompetitorGapEngine,
  GeoAeoScorer,
  ActionSynthesizer,
  EngineLogger,
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create all service instances with shared dependencies.
 *
 * @param repositories - Repository layer (data access)
 * @param logger - Logger implementation (defaults to consoleLogger if not provided)
 */
export function createServices(
  repositories: Repositories,
  logger: Logger = consoleLogger,
  prisma?: PrismaClient,
) {
  const notification = new NotificationService(repositories, logger);
  const usage = new UsageService(repositories, logger);
  const workspaceAccess = new WorkspaceAccessService(repositories, logger);

  // Group 1: Core analysis (needed for injection into collection pipeline + engines)
  const faq = new FAQService(repositories, logger);
  const riskSignal = new RiskSignalService(repositories, logger);
  const commentAnalysis = new CommentAnalysisService(repositories, logger);
  const listeningAnalysis = new ListeningAnalysisService(repositories, logger);
  const intentAnalysis = new IntentAnalysisService(repositories, logger);
  const geoAeo = new GeoAeoService(repositories, logger);

  // Phase 6: Wire cross-service flows
  // CommentAnalysis → FAQ + RiskSignal (downstream dispatch)
  commentAnalysis.setDownstreamServices({
    faqService: faq,
    riskSignalService: riskSignal,
  });

  // Group 3: Collection pipeline — wire up service injection
  const analyticsInputBuilder = new AnalyticsInputBuilder(repositories, logger);
  analyticsInputBuilder.setServices({
    commentAnalyzer: commentAnalysis,
    listeningCollector: listeningAnalysis,
    intentProcessor: intentAnalysis,
    geoAeoCollector: geoAeo,
  });

  return {
    // Group 1: Core analysis
    channelAnalysis: new ChannelAnalysisService(repositories, logger),
    competitor: new CompetitorService(repositories, logger),
    commentAnalysis,
    faq,
    riskSignal,
    listeningAnalysis,
    trend: new TrendService(repositories, logger),
    intentAnalysis,

    // Group 2: GEO/AEO
    geoAeo,
    citation: new CitationService(repositories, logger),

    // Group 2: Reports & evidence
    report: new ReportService(repositories, logger),
    evidence: new EvidenceService(repositories, logger),

    // Group 2: Actions
    actionRecommendation: new ActionRecommendationService(repositories, logger),

    // Group 2: Influencer & campaigns
    influencerExecution: new InfluencerExecutionService(repositories, logger),
    campaign: new CampaignService(repositories, logger),
    campaignPerformance: new CampaignPerformanceService(repositories, logger),

    // Group 2: Workspace & usage
    workspaceAccess,
    usage,

    // Group 2: Ops
    opsMonitoring: new OpsMonitoringService(repositories, logger),
    collectionOrchestration: new CollectionOrchestrationService(
      repositories,
      logger,
    ),

    // Group 2: Notifications
    notification,

    // Group 3: Collection pipeline (Phase 5)
    collectionRunner: new CollectionRunner(repositories, logger),
    analyticsInputBuilder,

    // Group 5: Phase 7 — Intelligence output layer
    insightGeneration: new InsightGenerationService(repositories, logger),
    insightSummary: new InsightSummaryService(repositories, logger),
    executiveSummary: new ExecutiveSummaryService(repositories, logger),
    evidenceBundle: new EvidenceBundleService(repositories, logger),
    actionOrchestrator: new ActionRecommendationOrchestrator(
      repositories,
      logger,
    ),
    reportComposition: new ReportCompositionService(repositories, logger),
    reportSectionBuilder: new ReportSectionBuilder(repositories, logger),
    alertTrigger: new AlertTriggerPreparationService(repositories, logger),
    automationOrchestrator: new AutomationOrchestratorService(
      repositories,
      logger,
    ),
    scheduleRegistry: new ScheduleRegistryService(repositories, logger),
    triggerEvaluation: new TriggerEvaluationService(repositories, logger),
    automationExecutionLog: new AutomationExecutionLogService(
      repositories,
      logger,
    ),
    automationAccessControl: new AutomationAccessControlService(
      repositories,
      logger,
    ),
    deliveryRetry: new DeliveryRetryService(repositories, logger),

    // Group 6: Domain-specific automation services
    ...(prisma
      ? {
          reportAutomation: new ReportAutomationService(prisma, logger),
          alertAutomation: new AlertAutomationService(prisma, logger),
          actionFollowup: new ActionFollowupService(prisma, logger),
          geoRecommendationAutomation: new GeoRecommendationAutomationService(
            prisma,
            logger,
          ),
          campaignFollowupAutomation: new CampaignFollowupAutomationService(
            prisma,
            logger,
          ),
        }
      : {}),

    // Group 7: Search Intelligence Integration (stateless — no repo/logger needed)
    searchInsightIntegration: new SearchInsightIntegrationService(),
    searchActionIntegration: new SearchActionIntegrationService(),
    searchEvidenceBundle: new SearchEvidenceBundleService(),
    searchReportSectionBuilder: new SearchReportSectionBuilderService(),
    searchExecutiveSummary: new SearchExecutiveSummaryService(),

    // Group 8: Document Generation (stateless)
    searchDocumentGeneration: new SearchDocumentGenerationService(),

    // Group 9: PT Deck Generation (stateless)
    ptDeckGeneration: new PtDeckGenerationService(),

    // Group 10: Work Document Generation (stateless)
    workReportGeneration: new WorkReportGenerationService(),

    // Group 11: Vertical Template Engine (stateless)
    verticalTemplateRegistry: new VerticalTemplateRegistryService(),
    verticalDocumentAssembler: new VerticalDocumentAssembler(),
    verticalInsightMapper: new VerticalInsightMapper(),
    verticalActionMapper: new VerticalActionMapper(),
    verticalEvidencePolicy: new VerticalEvidencePolicyService(),

    // Group 11b: Vertical Runtime Connection (stateless)
    verticalIndustrySuggester: new VerticalIndustrySuggester(),
    verticalPreviewBuilder: new VerticalPreviewBuilder(),
    verticalDocumentIntegration: new VerticalDocumentIntegrationService(),

    // Group 11c: Vertical Preview (stateless)
    verticalComparisonAssembler: new VerticalComparisonAssembler(),
    verticalDifferenceHighlighter: new VerticalDifferenceHighlighter(),
    verticalPreviewService: new VerticalPreviewService(),
    verticalPreviewViewModelBuilder: new VerticalPreviewViewModelBuilder(),

    // Group 12: Export Format Engine (stateless)
    exportOrchestrator: new ExportOrchestratorService(),
    exportBlockAssembler: new ExportBlockAssembler(),
    exportWarningBuilder: new ExportWarningBuilder(),
    verticalExportPolicy: new VerticalExportPolicyService(),
    wordExportBuilder: new WordExportBuilder(),
    pptExportBuilder: new PptExportBuilder(),
    pdfExportBuilder: new PdfExportBuilder(),

    // Group 13: Vertical Intelligence Enhancement (stateless)
    topicTaxonomyMapping: new TopicTaxonomyMappingService(),
    benchmarkBaseline: new BenchmarkBaselineService(),
    verticalSocialCommentIntegration:
      new VerticalSocialCommentIntegrationService(),
    verticalSignalFusion: new VerticalSignalFusionService(),

    // Group 4: Analytics engines (Phase 6)
    // Standalone engine instances for direct use
    engines: {
      textAnalyzer: new TextAnalyzer(),
      intentClassifier: new IntentClassifier(),
      clusterEngine: new ClusterEngine(),
      journeyEngine: new JourneyEngine(),
      competitorGapEngine: new CompetitorGapEngine(),
      geoAeoScorer: new GeoAeoScorer(),
      actionSynthesizer: new ActionSynthesizer(),
      engineLogger: new EngineLogger(logger),
    },
  };
}

export type Services = ReturnType<typeof createServices>;
