import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { callAI } from "@/lib/callAI";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import VoiceResponseModal from "@/components/VoiceResponseModal";

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
  const [modalOpen, setModalOpen] = useState(false);

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

  // ---------- Mic Toggle ----------

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

    // Reset & open modal
    resetTranscript();
    setLastQuery("");
    setLastResponse("");
    setIsProcessing(false);
    setModalOpen(true);
    startListening();
  };

  // ---------- Modal close ----------

  const handleCloseModal = () => {
    setModalOpen(false);
    // Stop any ongoing TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Stop listening if still active
    if (isListening) {
      stopListening();
    }
  };

  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // ---------- Intent handling ----------

  const handleVoiceIntent = async (text) => {
    const query = (text || "").toLowerCase();

    const navigated = handleNavigationIntent(query);
    if (navigated) return;

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
        const errMsg = data.error || "Unable to get crop advisory right now.";
        setLastResponse(errMsg);
        setIsProcessing(false);
        speak(errMsg, detectedLanguage.code);
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
        ? `You can try ${firstTreatment.name || firstTreatment.product} with dosage ${firstTreatment.dosagePerAcre} per acre.`
        : "Please consult your local agronomist or input dealer for exact treatment and dosage.";

      const summary = `Based on your description, the likely problem is ${diseaseName}. The severity looks ${severity}. ${treatmentLine}`;

      setLastResponse(summary);
      setIsProcessing(false);
      speak(summary, detectedLanguage.code);
    } catch (err) {
      console.error("Voice assistant advisory error:", err);
      const errMsg = err instanceof Error ? err.message : "Sorry, I couldn't process your request.";
      setLastResponse(errMsg);
      setIsProcessing(false);
      speak(errMsg, detectedLanguage.code);
    }
  };

  if (!isFarmerRoute) return null;

  return (
    <>
      {/* Voice Response Modal */}
      <VoiceResponseModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        transcriptText={lastQuery || transcript}
        aiResponseText={lastResponse}
        isListening={isListening}
        isLoading={isProcessing}
        isSpeaking={isSpeaking}
        detectedLanguage={detectedLanguage.label || "Auto"}
        onStopSpeech={handleStopSpeech}
      />

      {/* Floating mic button */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={handleMicToggle}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-glow-lg border transition-all duration-200 ${isListening
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
          {!modalOpen && (
            <span className="absolute -inset-1 rounded-full border border-primary/30 opacity-60 animate-ping" />
          )}
        </button>
      </div>
    </>
  );
};

export default VoiceAssistant;
