import { HelpCircle, MessageCircle } from "lucide-react";
import type { FaqItem } from "@/lib/comments/types";
import { TopicBadge } from "./badges";

type Props = {
  faqs: FaqItem[];
};

export function FaqSummaryCard({ faqs }: Props) {
  if (faqs.length === 0) return null;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
          <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
        </div>
        <h3 className="text-[13px] font-semibold">
          Frequently Asked Questions
        </h3>
        <span className="badge bg-blue-50 text-[10px] text-blue-700">
          {faqs.length}
        </span>
      </div>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-md border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-1.5">
                  <TopicBadge topic={faq.topicLabel} />
                  <span className="flex items-center gap-0.5 text-[10px] text-[var(--muted-foreground)]">
                    <MessageCircle className="h-2.5 w-2.5" />
                    {faq.count}
                  </span>
                </div>
                <p className="text-[12px] font-medium text-[var(--foreground)]">
                  {faq.question}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                  {faq.suggestedAnswer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
