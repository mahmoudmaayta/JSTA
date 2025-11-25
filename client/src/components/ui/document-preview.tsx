import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Eye, Download, FileText, ImageIcon, AlertCircle, X } from "lucide-react";

interface DocumentPreviewProps {
  documentId: number;
  filename: string;
  onClose?: () => void;
}

function getFileType(filename: string): "pdf" | "image" | "other" {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

export function DocumentPreviewDialog({
  documentId,
  filename,
  onClose,
}: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fileType = getFileType(filename);
  const previewUrl = `/api/documents/${documentId}/preview`;
  const downloadUrl = `/api/documents/${documentId}/download`;

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-shrink-0">
        <div className="flex items-center justify-between gap-2 pr-8">
          <DialogTitle className="flex items-center gap-2 truncate">
            {fileType === "pdf" && <FileText className="h-5 w-5 shrink-0" />}
            {fileType === "image" && <ImageIcon className="h-5 w-5 shrink-0" />}
            <span className="truncate">{filename}</span>
          </DialogTitle>
          <a href={downloadUrl} download data-testid="button-download-preview">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </a>
        </div>
      </DialogHeader>

      <div className="flex-1 min-h-0 relative bg-muted rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Unable to preview this file</p>
            <p className="text-sm mb-4">The file format may not be supported for preview.</p>
            <a href={downloadUrl} download>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download instead
              </Button>
            </a>
          </div>
        ) : fileType === "pdf" ? (
          <iframe
            src={previewUrl}
            className="w-full h-full min-h-[70vh]"
            onLoad={handleLoad}
            onError={handleError}
            title={`Preview of ${filename}`}
          />
        ) : fileType === "image" ? (
          <div className="flex items-center justify-center h-full min-h-[50vh] p-4">
            <img
              src={previewUrl}
              alt={filename}
              className="max-w-full max-h-full object-contain"
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Preview not available</p>
            <p className="text-sm mb-4">This file type cannot be previewed in the browser.</p>
            <a href={downloadUrl} download>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download to view
              </Button>
            </a>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

interface DocumentPreviewButtonProps {
  documentId: number;
  filename: string;
}

export function DocumentPreviewButton({ documentId, filename }: DocumentPreviewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
        data-testid={`button-preview-${documentId}`}
      >
        <Eye className="h-4 w-4" />
        Preview
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DocumentPreviewDialog
          documentId={documentId}
          filename={filename}
          onClose={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
