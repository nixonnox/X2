"use client";

import { Mail, X, Plus, Send } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSend: (recipients: { email: string; name: string }[]) => void;
  reportTitle: string;
};

export function EmailSendDialog({ open, onClose, onSend, reportTitle }: Props) {
  const [recipients, setRecipients] = useState([{ email: "", name: "" }]);
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const addRow = () =>
    setRecipients((prev) => [...prev, { email: "", name: "" }]);

  const removeRow = (idx: number) =>
    setRecipients((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: "email" | "name", value: string) => {
    setRecipients((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  };

  const handleSend = async () => {
    const valid = recipients.filter((r) => r.email.trim());
    if (valid.length === 0) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 500));
    onSend(valid);
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card mx-4 w-full max-w-lg overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-500" />
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
              이메일 발송
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="mb-1 text-[12px] text-[var(--muted-foreground)]">
              리포트
            </p>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              {reportTitle}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[12px] text-[var(--muted-foreground)]">
              수신자
            </p>
            <div className="space-y-2">
              {recipients.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="이메일"
                    value={r.email}
                    onChange={(e) => updateRow(i, "email", e.target.value)}
                    className="flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[12px] outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="이름 (선택)"
                    value={r.name}
                    onChange={(e) => updateRow(i, "name", e.target.value)}
                    className="w-28 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[12px] outline-none focus:border-blue-500"
                  />
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-[var(--muted-foreground)] hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-3 w-3" /> 수신자 추가
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--secondary)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {sending ? "발송 중..." : "발송"}
          </button>
        </div>
      </div>
    </div>
  );
}
