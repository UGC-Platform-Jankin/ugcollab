import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface Props {
  videoUrl: string | null;
  title?: string;
  onClose: () => void;
}

const VideoPlayerDialog = ({ videoUrl, title, onClose }: Props) => {
  return (
    <Dialog open={!!videoUrl} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-border/50">
        <div className="relative">
          {title && (
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
              <p className="text-white text-sm font-medium truncate pr-8">{title}</p>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          {videoUrl && (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full max-h-[80vh] object-contain"
            >
              Your browser does not support video playback.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayerDialog;
