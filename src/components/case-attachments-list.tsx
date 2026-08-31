import { formatAttachmentSize } from "@/lib/case-attachments";

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export function CaseAttachmentsList({
  caseId,
  attachments,
  heading = "Examination files",
  note,
}: {
  caseId: string;
  attachments: Attachment[];
  heading?: string;
  note?: string;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-mist bg-white p-4">
      <p className="text-sm font-medium">{heading}</p>
      {note ? <p className="mt-1 text-xs text-ink/50">{note}</p> : null}
      <ul className="mt-3 flex flex-col gap-2">
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <a
              href={`/api/cases/${caseId}/attachments/${attachment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-mist px-3 py-2 text-sm hover:border-sage/40"
            >
              <span className="truncate font-medium">{attachment.fileName}</span>
              <span className="shrink-0 font-mono text-xs text-ink/45">
                {formatAttachmentSize(attachment.sizeBytes)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
