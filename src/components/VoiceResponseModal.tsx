import { useEffect, useRef, useState } from "react";
import { X, Mic, Loader2, Volume2, VolumeX, Sprout } from "lucide-react";

/*
 * VoiceResponseModal
 * Full-screen blurred overlay with animated subtitle typing,
 * wave animation, and integrated TTS playback control.
 */

const TYPEWRITER_SPEED_MS = 30; // ms per character

// ---------- Typewriter hook ----------
function useTypewriter(text, speed = TYPEWRITER_SPEED_MS) {
    const [display, setDisplay] = useState("");
    const [done, setDone] = useState(false);
    const raf = useRef(null);

    useEffect(() => {
        if (!text) {
            setDisplay("");
            setDone(false);
            return;
        }

        let i = 0;
        setDisplay("");
        setDone(false);

        const tick = () => {
            i += 1;
            setDisplay(text.slice(0, i));
            if (i < text.length) {
                raf.current = setTimeout(tick, speed);
            } else {
                setDone(true);
            }
        };

        raf.current = setTimeout(tick, speed);
        return () => clearTimeout(raf.current);
    }, [text, speed]);

    return { display, done };
}

// ---------- Wave bars component ----------
function WaveBars({ color = "bg-white/80" }) {
    return (
        <div className="flex items-end gap-[3px] h-5">
            {[0, 1, 2, 3, 4].map((i) => (
                <span
                    key={i}
                    className={`w-[3px] rounded-full ${color}`}
                    style={{
                        animation: `voiceWave 1.2s ease-in-out ${i * 0.15}s infinite`,
                        height: `${8 + (i % 3) * 4}px`,
                    }}
                />
            ))}
            <style>{`
        @keyframes voiceWave {
          0%, 100% { transform: scaleY(0.4); }
          50%       { transform: scaleY(1); }
        }
      `}</style>
        </div>
    );
}

// ---------- Main component ----------

export default function VoiceResponseModal({
    isOpen,
    onClose,
    transcriptText,
    aiResponseText,
    isListening,
    isLoading,
    isSpeaking,
    detectedLanguage,
    onStopSpeech,
}) {
    const { display: typedResponse, done: typingDone } = useTypewriter(
        aiResponseText || ""
    );

    // Prevent background scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Determine phase
    const phase = isListening
        ? "listening"
        : isLoading
            ? "analyzing"
            : aiResponseText
                ? "response"
                : transcriptText
                    ? "transcribed"
                    : "idle";

    const phaseLabel = {
        listening: "Listening…",
        transcribed: "Processing your request…",
        analyzing: "Analyzing…",
        response: isSpeaking ? "Speaking…" : typingDone ? "Response ready" : "Responding…",
        idle: "Tap the mic to start",
    }[phase];

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
        >
            {/* Backdrop click to close */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Card */}
            <div
                className="relative z-10 w-[calc(100%-2rem)] max-w-md mx-4 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300"
                style={{
                    background: "linear-gradient(145deg, #064e3b 0%, #065f46 40%, #047857 100%)",
                }}
            >
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 pt-5 pb-2">
                    <div className="flex items-center gap-2 text-white/90">
                        <Sprout className="w-5 h-5" />
                        <span className="text-sm font-semibold tracking-wide">KisanSetu Voice</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Language badge */}
                        {detectedLanguage && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/70 font-medium">
                                {detectedLanguage}
                            </span>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-white/15 transition-colors text-white/70 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Visual center */}
                <div className="flex flex-col items-center px-6 py-6 gap-4">
                    {/* Animated icon area */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                        {/* Glow ring */}
                        <span
                            className={`absolute inset-0 rounded-full transition-all duration-700 ${phase === "listening"
                                    ? "bg-red-500/20 animate-ping"
                                    : phase === "analyzing"
                                        ? "bg-emerald-400/20 animate-pulse"
                                        : phase === "response" && isSpeaking
                                            ? "bg-emerald-300/15 animate-pulse"
                                            : "bg-white/5"
                                }`}
                        />
                        <div
                            className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-500 ${phase === "listening"
                                    ? "bg-red-500/30 border-2 border-red-400/50"
                                    : phase === "analyzing"
                                        ? "bg-emerald-600/40 border-2 border-emerald-400/40"
                                        : "bg-white/10 border-2 border-white/20"
                                }`}
                        >
                            {phase === "listening" ? (
                                <Mic className="w-7 h-7 text-red-300 animate-pulse" />
                            ) : phase === "analyzing" ? (
                                <Loader2 className="w-7 h-7 text-emerald-300 animate-spin" />
                            ) : phase === "response" && isSpeaking ? (
                                <WaveBars />
                            ) : (
                                <Volume2 className="w-7 h-7 text-white/60" />
                            )}
                        </div>
                    </div>

                    {/* Phase label */}
                    <p className="text-xs font-medium tracking-widest uppercase text-emerald-200/70">
                        {phaseLabel}
                    </p>

                    {/* Transcript bubble */}
                    {transcriptText && (
                        <div className="w-full bg-white/10 rounded-2xl px-4 py-3 text-white/90 text-sm leading-relaxed">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-300/60 block mb-1">
                                You said
                            </span>
                            "{transcriptText}"
                        </div>
                    )}

                    {/* AI Response area */}
                    {phase === "analyzing" && (
                        <div className="flex items-center gap-2 text-emerald-200/70 text-sm py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Getting advice from KisanSetu AI…</span>
                        </div>
                    )}

                    {aiResponseText && (
                        <div className="w-full bg-white/10 rounded-2xl px-4 py-4 max-h-56 overflow-y-auto">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-300/60 block mb-2">
                                AI Response
                            </span>
                            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                {typedResponse}
                                {!typingDone && (
                                    <span className="inline-block w-0.5 h-4 bg-emerald-300 ml-0.5 animate-pulse" />
                                )}
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom controls */}
                <div className="flex items-center justify-center gap-4 px-6 pb-6">
                    {isSpeaking && onStopSpeech && (
                        <button
                            onClick={onStopSpeech}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white/90 text-sm transition-colors"
                        >
                            <VolumeX className="w-4 h-4" />
                            Stop voice
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
