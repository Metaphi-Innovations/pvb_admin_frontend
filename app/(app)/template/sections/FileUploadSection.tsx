import { Upload, File, X, Check } from "lucide-react";

export default function FileUploadSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">File Upload Area</h3>
        <div className="border-2 border-dashed border-brand-300 rounded-lg p-8 text-center hover:bg-brand-50 transition-colors cursor-pointer">
          <Upload className="w-10 h-10 text-brand-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">Drop files here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">Max file size: 50MB</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">File List</h3>
        <div className="space-y-2">
          {[
            { name: "invoice-2024.pdf", size: "2.4 MB", status: "uploaded" },
            { name: "report-q1.xlsx", size: "1.8 MB", status: "uploading" },
            { name: "data-dump.csv", size: "5.2 MB", status: "error" },
          ].map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-lg"
            >
              <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        file.status === "uploaded"
                          ? "bg-emerald-500 w-full"
                          : file.status === "uploading"
                          ? "bg-brand-500 w-1/2"
                          : "bg-red-500 w-full"
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{file.size}</p>
                </div>
              </div>
              {file.status === "uploaded" && <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              {file.status === "error" && <X className="w-5 h-5 text-red-600 flex-shrink-0 cursor-pointer" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Upload Patterns</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Drag and drop area</p>
          <p>• Progress indicators</p>
          <p>• File validation</p>
          <p>• Success/error states</p>
          <p>• Remove file option</p>
        </div>
      </div>
    </div>
  );
}
