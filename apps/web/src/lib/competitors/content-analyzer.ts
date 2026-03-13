import type {
  CompetitorContent,
  FormatDistribution,
  TopicDistribution,
  ContentFormat,
  ContentTopic,
} from "./types";

const FORMAT_LABELS: Record<ContentFormat, string> = {
  video: "Video",
  short_form: "Short Form",
  image: "Image",
  thread: "Thread",
  text: "Text",
  live: "Live",
};

const TOPIC_LABELS: Record<ContentTopic, string> = {
  tutorial: "Tutorial",
  entertainment: "Entertainment",
  product: "Product",
  announcement: "Announcement",
  community: "Community",
  review: "Review",
  news: "News",
};

function countBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

export function buildFormatDistribution(
  ourContents: CompetitorContent[],
  competitorContents: CompetitorContent[],
): FormatDistribution[] {
  const ourCounts = countBy(ourContents, (c) => c.contentType);
  const compCounts = countBy(competitorContents, (c) => c.contentType);
  const ourTotal = ourContents.length || 1;
  const compTotal = competitorContents.length || 1;

  const allFormats = new Set([
    ...Object.keys(ourCounts),
    ...Object.keys(compCounts),
  ]) as Set<ContentFormat>;

  return Array.from(allFormats).map((format) => ({
    format,
    label: FORMAT_LABELS[format] ?? format,
    ourCount: ourCounts[format] ?? 0,
    competitorCount: compCounts[format] ?? 0,
    ourPercent: +(((ourCounts[format] ?? 0) / ourTotal) * 100).toFixed(0),
    competitorPercent: +(((compCounts[format] ?? 0) / compTotal) * 100).toFixed(
      0,
    ),
  }));
}

export function buildTopicDistribution(
  ourContents: CompetitorContent[],
  competitorContents: CompetitorContent[],
): TopicDistribution[] {
  const ourCounts = countBy(ourContents, (c) => c.topic);
  const compCounts = countBy(competitorContents, (c) => c.topic);
  const ourTotal = ourContents.length || 1;
  const compTotal = competitorContents.length || 1;

  const allTopics = new Set([
    ...Object.keys(ourCounts),
    ...Object.keys(compCounts),
  ]) as Set<ContentTopic>;

  return Array.from(allTopics).map((topic) => ({
    topic,
    label: TOPIC_LABELS[topic] ?? topic,
    ourCount: ourCounts[topic] ?? 0,
    competitorCount: compCounts[topic] ?? 0,
    ourPercent: +(((ourCounts[topic] ?? 0) / ourTotal) * 100).toFixed(0),
    competitorPercent: +(((compCounts[topic] ?? 0) / compTotal) * 100).toFixed(
      0,
    ),
  }));
}
