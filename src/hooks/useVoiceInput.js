import { useCallback, useRef, useState } from "react";

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition ||
    window.msSpeechRecognition ||
    null
  );
};

const detectLanguageFromText = (text) => {
  const cleaned = (text || "").trim();
  if (!cleaned) {
    return { code: "auto", label: "Auto" };
  }

  // Basic script-based detection for Indian languages
  const hasDevanagari = /[\u0900-\u097F]/.test(cleaned);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(cleaned);
  const hasKannada = /[\u0C80-\u0CFF]/.test(cleaned);
  const hasTamil = /[\u0B80-\u0BFF]/.test(cleaned);

  if (hasTelugu) return { code: "te-IN", label: "Telugu" };
  if (hasKannada) return { code: "kn-IN", label: "Kannada" };
  if (hasTamil) return { code: "ta-IN", label: "Tamil" };
  if (hasDevanagari) return { code: "hi-IN", label: "Hindi" };

  // Default to English for mixed/Latin text
  return { code: "en-IN", label: "English" };
};

const mapRecognitionError = (error) => {
  if (!error) return null;
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone access was blocked. Please allow mic access in your browser settings.";
  }
  if (error === "no-speech") {
    return "No speech was detected. Please try speaking again.";
  }
  if (error === "audio-capture") {
    return "No microphone was found. Please check your device audio settings.";
  }
  return "Voice recognition is unavailable right now. Please try again.";
};

export const useVoiceInput = () => {
  const RecognitionClass = getSpeechRecognition();
  const [supported] = useState(() => Boolean(RecognitionClass));

  const recognitionRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState({
    code: "auto",
    label: "Auto",
  });

  const stopListening = useCallback(() => {
    const instance = recognitionRef.current;
    if (instance) {
      try {
        instance.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setFinalTranscript("");
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const startListening = useCallback(() => {
    if (!supported || !RecognitionClass) {
      setError("Your browser does not support voice input.");
      return;
    }

    // Clean up any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recognition = new RecognitionClass();
    recognition.lang = "hi-IN"; // Optimized for Indian languages (works well for Hindi + English mix)
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setIsProcessing(false);
      setTranscript("");
      setFinalTranscript("");
      setError(null);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setIsProcessing(false);
      setError(mapRecognitionError(event?.error));
    };

    recognition.onresult = (event) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i += 1) {
        combined += event.results[i][0].transcript;
      }
      const text = combined.trim();
      setTranscript(text);

      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult.isFinal) {
        setFinalTranscript(text);
        const langInfo = detectLanguageFromText(text);
        setDetectedLanguage(langInfo);
        setIsListening(false);
        setIsProcessing(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      setIsProcessing(false);
      recognition.start();
    } catch {
      setError("Unable to start microphone. Please try again.");
      setIsListening(false);
    }
  }, [RecognitionClass, supported]);

  const speak = useCallback(
    (text, overrideLangCode) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setError("Your browser does not support text-to-speech.");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      const langInfo =
        overrideLangCode && overrideLangCode !== "auto"
          ? { code: overrideLangCode }
          : detectedLanguage.code === "auto"
          ? detectLanguageFromText(text)
          : detectedLanguage;

      utterance.lang = langInfo.code || "en-IN";

      const voices = window.speechSynthesis.getVoices() || [];
      const preferredVoice =
        voices.find((v) => v.lang === langInfo.code) ||
        voices.find((v) => v.lang.startsWith(langInfo.code.split("-")[0])) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setError("Unable to play voice response.");
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [detectedLanguage],
  );

  return {
    supported,
    isListening,
    isProcessing,
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
  };
};

