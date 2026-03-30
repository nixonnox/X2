// PT Deck Generation — Barrel export

// Types
export type {
  PtDeck,
  PtDeckType,
  PtSlideBlock,
  PtSlideType,
  PtNarrative,
  PtAudience,
  PtQualityMeta,
  PtAudienceConfig,
  RecommendedVisualType,
  EvidenceRef,
  SourceRef,
} from "./types";
export { PT_DECK_SLIDE_MAP, PT_AUDIENCE_CONFIG } from "./types";

// Services
export { PtDeckGenerationService } from "./pt-deck-generation.service";
export type { GeneratePtDeckInput } from "./pt-deck-generation.service";
export { PtSlideBlockBuilder } from "./pt-slide-block-builder";
export { PtNarrativeAssembler } from "./pt-narrative-assembler";
export { SearchToPtSlideMapper } from "./search-to-pt-slide-mapper";
export type { SlideContext } from "./search-to-pt-slide-mapper";
export { EvidenceToPtVisualHintMapper } from "./evidence-to-pt-visual-hint-mapper";
export { RoleBasedPtAssembler } from "./role-based-pt-assembler";
