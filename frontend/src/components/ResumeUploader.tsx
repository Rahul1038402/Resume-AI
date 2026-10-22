
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FileUp, FileCheck2 } from "lucide-react";

interface ResumeUploaderProps {
  onFileSelected: (file: File) => void;
}

const ResumeUploader = ({ onFileSelected }: ResumeUploaderProps) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Check if file is PDF or DOCX
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file only.");
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    setFileName(file.name);
    onFileSelected(file);
    toast.success("Resume uploaded successfully!");
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  return (
    <Card
      className={`rounded-xl border border-dashed p-8 transition-colors duration-200 ${
        isDragging ? "border-white/40 bg-white/[0.04]" : "border-line-strong bg-ink-card"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-line-strong bg-ink-soft">
          {fileName ? (
            <FileCheck2 className="h-5 w-5 text-white" strokeWidth={1.6} />
          ) : (
            <FileUp className="h-5 w-5 text-mute" strokeWidth={1.6} />
          )}
        </div>

        <h3 className="text-[0.95rem] text-white">
          {fileName ? "Resume uploaded" : "Upload your resume"}
        </h3>

        <p className="mx-auto mt-1.5 max-w-sm text-[0.8rem] leading-relaxed text-mute-dim">
          {fileName || "Drag a PDF or DOCX here, or browse. 5MB limit."}
        </p>

        <div className="relative mt-5">
          <button
            type="button"
            onClick={() => document.getElementById("resume-file-input")?.click()}
            className="rounded-md border border-line-strong px-3.5 py-1.5 text-[0.8rem] font-medium text-white transition-colors duration-200 hover:border-line-bright hover:bg-white/[0.06]"
          >
            {fileName ? "Change file" : "Browse files"}
          </button>
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </Card>
  );
};

export default ResumeUploader;
