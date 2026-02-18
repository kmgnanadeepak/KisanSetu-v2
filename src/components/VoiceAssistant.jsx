import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { callAI } from "@/lib/callAI";
import { useVoiceInput } from "@/hooks/useVoiceInput";

const VoiceAssistant = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    supported,
    isListening,
    isSpeaking,
    transcript,
    finalTranscript,
    error,
    detectedLanguage,
    startListening,
    stopListening,
    speak,
    resetTranscript,
    resetError,
  } = useVoiceInput();

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [lastResponse, setLastResponse] = useState("");

  const isFarmerRoute = useMemo(
    () => location.pathname.startsWith("/farmer"),
    [location.pathname],
  );

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!finalTranscript) return;
    setLastQuery(finalTranscript);
    handleVoiceIntent(finalTranscript);
  }, [finalTranscript]);

  const handleMicToggle = () => {
    if (!isFarmerRoute) return;

    if (!supported) {
      toast.error("Voice assistant is not supported in this browser.");
      return;
    }

    resetError();

    if (isListening) {
      stopListening();
      return;
    }

    resetTranscript();
    setLastQuery("");
    setLastResponse("");
    setIsProcessing(false);
    startListening();
  };

  const handleVoiceIntent = async (text) => {
    const query = (text || "").toLowerCase();

    // Try navigation shortcuts first
    const navigated = handleNavigationIntent(query);
    if (navigated) return;

    // Otherwise, treat as crop advisory / disease query
    await handleCropAdvisory(text);
  };

  const handleNavigationIntent = (query) => {
    const intents = [
      {
        match: ["open my orders", "my orders", "orders"],
        path: "/farmer/orders",
        response: "Opening your orders.",
      },
      {
        match: ["show mandi prices", "mandi prices", "market prices", "compare prices"],
        path: "/farmer/merchant-compare",
        response: "Showing mandi price comparison.",
      },
      {
        match: ["sell my crop", "sell crop", "sell crops", "sell produce"],
        path: "/farmer/marketplace",
        response: "Opening your marketplace to sell crops.",
      },
      {
        match: ["check wallet balance", "wallet balance", "wallet"],
        path: "/farmer",
        response: "Opening your dashboard. Wallet balance will be shown where available.",
      },
      {
        match: ["open dashboard", "home", "farmer dashboard"],
        path: "/farmer",
        response: "Taking you to your farmer dashboard.",
      },
      {
        match: ["disease detection", "check disease", "scan leaves", "scan leaf"],
        path: "/farmer/disease-detection",
        response: "Opening disease detection.",
      },
      {
        match: ["nearby shops", "agri shops", "agriculture shops"],
        path: "/farmer/nearby-shops",
        response: "Showing nearby agricultural shops.",
      },
      {
        match: ["calendar", "farming calendar", "schedule"],
        path: "/farmer/calendar",
        response: "Opening your smart farming calendar.",
      },
      {
        match: ["customer orders", "my customer orders"],
        path: "/farmer/customer-orders",
        response: "Opening your customer orders.",
      },
    ];

    const intent = intents.find((item) =>
      item.match.some((phrase) => query.includes(phrase)),
    );

    if (!intent) return false;

    navigate(intent.path);
    setLastResponse(intent.response);
    speak(intent.response, detectedLanguage.code);
    return true;
  };

  const handleCropAdvisory = async (utterance) => {
    if (!utterance?.trim()) return;

    setIsProcessing(true);
    try {
      const data = await callAI("advisory", {
        query: utterance,
      });

      if (!data.success) {
        toast.error(data.error || "Unable to get crop advisory right now.");
        setIsProcessing(false);
        return;
      }

      const analysis = data.analysis || {};
      const diseaseName = analysis.disease_name || "your crop issue";
      const severity = analysis.severity || "medium";
      const treatments = Array.isArray(analysis.treatments)
        ? analysis.treatments
        : [];

      const firstTreatment = treatments[0];
      const treatmentLine = firstTreatment
        ? `You can try ${firstTreatment.name} with dosage ${firstTreatment.dosagePerAcre} ${firstTreatment.unit} per acre.`
        : "Please consult your local agronomist or input dealer for exact treatment and dosage.";

      const summary = `Based on your description, the likely problem is ${diseaseName}. The severity looks ${severity}. ${treatmentLine}`;

      setLastResponse(summary);
      setIsProcessing(false);
      speak(summary, detectedLanguage.code);
    } catch (err) {
      console.error("Voice assistant advisory error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong while getting advice.");
      setIsProcessing(false);
    }
  };

  if (!isFarmerRoute) return null;

  const statusLabel = (() => {
    if (!supported) return "Voice not supported";
    if (error) return "Mic blocked";
    if (isListening) return "Listening...";
    if (isProcessing) return "Processing...";
    if (isSpeaking) return "Speaking...";
    if (transcript) return "Tap to confirm new query";
    return "Tap to speak";
  })();

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
      {/* Status pill */}
      <div className="glass-card rounded-2xl px-4 py-3 shadow-lg border border-primary/40 bg-background/80 backdrop-blur-sm max-w-xs text-xs sm:text-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isListening ? (
              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            ) : isProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            ) : isSpeaking ? (
              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-primary" />
            ) : (
              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-muted-foreground/40" />
            )}
            <div className="flex flex-col">
              <span className="font-medium">
                {statusLabel}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Language: {detectedLanguage.label || "Auto"}
              </span>
            </div>
          </div>
          {lastQuery && (
            <button
              type="button"
              onClick={() => {
                setLastQuery("");
                setLastResponse("");
              }}
              className="p-1 rounded-full hover:bg-muted"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Waveform when listening */}
        {isListening && (
          <div className="mt-2 flex items-end gap-1 h-4">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-primary animate-[bounce_1s_infinite]"
                style={{
                  animationDelay: `${i * 0.12}s`,
                  animationDuration: "0.9s",
                  height: `${6 + i * 2}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Last response preview */}
        {lastResponse && (
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-3">
            {lastResponse}
          </p>
        )}
      </div>

      {/* Floating mic button */}
      <button
        type="button"
        onClick={handleMicToggle}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-glow-lg border transition-all duration-200 ${
          isListening
            ? "bg-red-500 border-red-400 text-white"
            : "bg-primary border-primary/60 text-primary-foreground"
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
        <span className="absolute -inset-1 rounded-full border border-primary/30 opacity-60 animate-ping" />
      </button>
    </div>
  );
};

export default VoiceAssistant;

