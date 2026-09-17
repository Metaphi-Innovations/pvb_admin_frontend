"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import {
  PackingListService,
  type PackingListEmailPreview,
} from "@/services/packing-list.service";

export function SendPackingListEmailModal({
  open,
  onOpenChange,
  packingListId,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packingListId: string | null;
  onSent?: (result: { to: string; packingListNo: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PackingListEmailPreview | null>(null);
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!open || !packingListId) {
      setPreview(null);
      setTo("");
      setError(null);
      setLoading(false);
      setSending(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      setPreview(null);
      try {
        const data = await PackingListService.fetchEmailPreview(
          packingListId,
          controller.signal,
        );
        if (cancelled) return;
        setPreview(data);
        setTo(data.to || "");
      } catch (err) {
        if (cancelled) return;
        setError(getErrorMessage(err, "Failed to load email preview."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, packingListId]);

  const handleSend = async () => {
    if (!packingListId || sending) return;
    const recipient = to.trim();
    if (!recipient || !recipient.includes("@")) {
      setError("Enter a valid recipient email address.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const result = await PackingListService.sendEmail(packingListId, {
        to: recipient,
      });
      onSent?.(result);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send Packing List email."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (sending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl z-[400] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50">
              <Mail className="h-4 w-4 text-blue-700" />
            </div>
            Send Packing List Email
          </DialogTitle>
          <DialogDescription className="text-xs">
            Preview the email and attachment, then send to the customer.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
          </div>
        ) : (
          <div className="space-y-4">
            {preview ? (
              <>
                <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-xs">
                  <span className="text-muted-foreground pt-2">To</span>
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={sending}
                    className="h-8 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                    placeholder="customer@example.com"
                  />
                  <span className="text-muted-foreground">Subject</span>
                  <span className="font-medium text-foreground break-words">
                    {preview.subject || "—"}
                  </span>
                  <span className="text-muted-foreground">Customer</span>
                  <span className="text-foreground">
                    {preview.customerName || "—"}
                  </span>
                  <span className="text-muted-foreground">Packing List</span>
                  <span className="text-foreground">
                    {preview.packingListNo || "—"}
                  </span>
                  <span className="text-muted-foreground">Attachment</span>
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    {preview.attachmentFileName || "Packing List PDF"}
                  </span>
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Email body
                  </p>
                  {preview.html ? (
                    <div
                      className="text-xs text-foreground [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4"
                      dangerouslySetInnerHTML={{ __html: preview.html }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-xs text-foreground">
                      {preview.text || "—"}
                    </pre>
                  )}
                </div>

                {!preview.to &&
                preview.missingReason === "customer_email_missing" ? (
                  <p className="text-xs text-amber-700">
                    No customer email found. Enter a recipient above to send.
                  </p>
                ) : null}
              </>
            ) : null}

            {error ? <p className="text-xs text-red-600">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={sending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={sending || loading || !preview || !to.trim()}
                onClick={() => void handleSend()}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5" /> Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
