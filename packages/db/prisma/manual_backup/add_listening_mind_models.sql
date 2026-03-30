-- Migration: add_listening_mind_models
-- Description: Add SearchPath, Persona, PersonaKeyword, KeywordClusterResult, BrandJourney models
-- Date: 2026-03-13

-- CreateEnum
CREATE TYPE "TemporalPhase" AS ENUM ('BEFORE', 'CURRENT', 'AFTER');

-- CreateEnum
CREATE TYPE "SearchPathType" AS ENUM ('DIRECT', 'AUTOCOMPLETE', 'RELATED', 'TEMPORAL', 'CO_SEARCH');

-- CreateEnum
CREATE TYPE "BrandContext" AS ENUM ('DIRECT', 'COMPARISON', 'ALTERNATIVE', 'RELATED');

-- CreateTable: SearchPath (Pathfinder)
CREATE TABLE "search_paths" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "fromKeyword" TEXT NOT NULL,
    "toKeyword" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phase" "TemporalPhase" NOT NULL,
    "intent" "IntentCategory" NOT NULL,
    "pathType" "SearchPathType" NOT NULL DEFAULT 'DIRECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Persona
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dominantIntent" "IntentCategory" NOT NULL,
    "dominantPhase" "TemporalPhase" NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "traits" JSONB,
    "topQuestions" TEXT[],
    "contentStrategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PersonaKeyword
CREATE TABLE "persona_keywords" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "persona_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable: KeywordClusterResult
CREATE TABLE "keyword_cluster_results" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "clusterIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "centroid" TEXT NOT NULL,
    "dominantIntent" "IntentCategory" NOT NULL,
    "dominantPhase" "TemporalPhase" NOT NULL,
    "avgGapScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "size" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT[],
    "gptAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_cluster_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BrandJourney (Road View)
CREATE TABLE "brand_journeys" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "fromBrand" TEXT NOT NULL,
    "toBrand" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "phase" "TemporalPhase" NOT NULL,
    "intent" "IntentCategory" NOT NULL,
    "context" "BrandContext" NOT NULL DEFAULT 'RELATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_paths_queryId_idx" ON "search_paths"("queryId");
CREATE UNIQUE INDEX "search_paths_queryId_fromKeyword_toKeyword_key" ON "search_paths"("queryId", "fromKeyword", "toKeyword");

CREATE INDEX "personas_queryId_idx" ON "personas"("queryId");

CREATE UNIQUE INDEX "persona_keywords_personaId_keyword_key" ON "persona_keywords"("personaId", "keyword");

CREATE INDEX "keyword_cluster_results_queryId_idx" ON "keyword_cluster_results"("queryId");

CREATE INDEX "brand_journeys_queryId_idx" ON "brand_journeys"("queryId");
CREATE UNIQUE INDEX "brand_journeys_queryId_fromBrand_toBrand_key" ON "brand_journeys"("queryId", "fromBrand", "toBrand");

-- AddForeignKey
ALTER TABLE "search_paths" ADD CONSTRAINT "search_paths_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "personas" ADD CONSTRAINT "personas_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "persona_keywords" ADD CONSTRAINT "persona_keywords_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "keyword_cluster_results" ADD CONSTRAINT "keyword_cluster_results_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_journeys" ADD CONSTRAINT "brand_journeys_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
