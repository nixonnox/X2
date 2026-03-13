/**
 * Cluster Engine.
 *
 * Groups keywords, topics, intents, and questions into semantic clusters.
 * Uses Jaccard similarity and keyword overlap for grouping.
 *
 * Upgrade path: Replace with embedding vectors + HDBSCAN or LLM-based clustering.
 */

import type { ClusterResult, ClusterMember, EngineVersion } from "./types";

const ENGINE_VERSION: EngineVersion = {
  engine: "cluster-engine",
  version: "1.0.0",
  model: "jaccard-similarity-v1",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClusterInput = {
  id: string;
  text: string;
  type: "keyword" | "topic" | "intent" | "question";
  metadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Cluster Engine
// ---------------------------------------------------------------------------

export class ClusterEngine {
  private readonly similarityThreshold: number;
  private readonly maxClusters: number;

  constructor(options?: {
    similarityThreshold?: number;
    maxClusters?: number;
  }) {
    this.similarityThreshold = options?.similarityThreshold ?? 0.25;
    this.maxClusters = options?.maxClusters ?? 20;
  }

  /**
   * Cluster input items by text similarity.
   */
  cluster(items: ClusterInput[]): ClusterResult[] {
    if (items.length === 0) return [];

    // 1. Tokenize all items
    const tokenized = items.map((item) => ({
      ...item,
      tokens: this.tokenize(item.text),
    }));

    // 2. Build similarity matrix and cluster greedily
    const assigned = new Set<number>();
    const clusters: Array<{
      center: number;
      members: Array<{ index: number; similarity: number }>;
    }> = [];

    for (
      let i = 0;
      i < tokenized.length && clusters.length < this.maxClusters;
      i++
    ) {
      if (assigned.has(i)) continue;

      // Start a new cluster with this item as center
      const cluster = {
        center: i,
        members: [{ index: i, similarity: 1.0 }],
      };
      assigned.add(i);

      // Find similar items
      for (let j = i + 1; j < tokenized.length; j++) {
        if (assigned.has(j)) continue;

        const similarity = this.jaccardSimilarity(
          tokenized[i]!.tokens,
          tokenized[j]!.tokens,
        );

        if (similarity >= this.similarityThreshold) {
          cluster.members.push({ index: j, similarity });
          assigned.add(j);
        }
      }

      clusters.push(cluster);
    }

    // Add remaining unassigned items as single-member clusters
    for (let i = 0; i < tokenized.length; i++) {
      if (!assigned.has(i) && clusters.length < this.maxClusters) {
        clusters.push({
          center: i,
          members: [{ index: i, similarity: 1.0 }],
        });
      }
    }

    // 3. Build ClusterResult objects
    return clusters.map((cluster, idx) => {
      const centerItem = tokenized[cluster.center]!;
      const members: ClusterMember[] = cluster.members.map((m) => {
        const item = tokenized[m.index]!;
        return {
          id: item.id,
          text: item.text,
          type: item.type,
          similarity: Math.round(m.similarity * 100) / 100,
        };
      });

      // Generate label from most common tokens among members
      const label = this.generateClusterLabel(
        cluster.members.map((m) => tokenized[m.index]!.tokens),
        centerItem.text,
      );

      // Score based on cluster cohesion
      const avgSimilarity =
        cluster.members.length > 1
          ? cluster.members.reduce((sum, m) => sum + m.similarity, 0) /
            cluster.members.length
          : 0.5;

      return {
        clusterId: `cluster-${idx + 1}`,
        label,
        representativePhrase: centerItem.text,
        memberItems: members,
        clusterScore: Math.round(avgSimilarity * 100) / 100,
        engineVersion: ENGINE_VERSION,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Similarity
  // ---------------------------------------------------------------------------

  private jaccardSimilarity(
    tokensA: Set<string>,
    tokensB: Set<string>,
  ): number {
    if (tokensA.size === 0 && tokensB.size === 0) return 1;
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) {
        intersection++;
      }
    }

    const union = tokensA.size + tokensB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private tokenize(text: string): Set<string> {
    const normalized = text.toLowerCase();

    // Split on whitespace and common delimiters
    const words = normalized
      .split(/[\s,./·\-_()[\]{}|:;'"!?]+/)
      .filter((w) => w.length > 1);

    // Also extract 2-char Korean bigrams for better matching
    const bigrams: string[] = [];
    const koreanChars = normalized.replace(/[^가-힣]/g, "");
    for (let i = 0; i < koreanChars.length - 1; i++) {
      bigrams.push(koreanChars.slice(i, i + 2));
    }

    return new Set([...words, ...bigrams]);
  }

  private generateClusterLabel(
    memberTokens: Set<string>[],
    centerText: string,
  ): string {
    if (memberTokens.length <= 1) return centerText;

    // Find tokens that appear in majority of members
    const tokenCounts = new Map<string, number>();
    for (const tokens of memberTokens) {
      for (const token of tokens) {
        tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
      }
    }

    const threshold = memberTokens.length * 0.5;
    const commonTokens = Array.from(tokenCounts.entries())
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([token]) => token);

    if (commonTokens.length > 0) {
      return commonTokens.join(" ");
    }

    return centerText;
  }
}
