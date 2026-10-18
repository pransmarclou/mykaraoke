import Image from "next/image";
import { Music2, Sparkles } from "lucide-react";

export function StageIllustration() {
  return (
    <div className="hero-art" role="img" aria-label="MyKaraoke microphone logo under stage lights">
      <div className="stage-spotlight" aria-hidden="true" />
      <div className="stage-orbit" aria-hidden="true" />
      <Image src="/brand/microphone-logo.png" alt="" width={1402} height={1122} className="stage-logo" priority />
      <div className="stage-note note-one" aria-hidden="true">
        <Music2 className="size-5" />
      </div>
      <div className="stage-note note-two" aria-hidden="true">
        <Sparkles className="size-5" />
      </div>
      <div className="signal-bars" aria-hidden="true">
        {[18, 30, 40, 22, 34, 17, 28, 38, 21].map((height, index) => (
          <span key={index} style={{ "--bar-height": `${height}px` } as React.CSSProperties} />
        ))}
      </div>
      <p className="preview-label">A stage for every song</p>
    </div>
  );
}
