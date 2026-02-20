import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { callAI } from "@/lib/callAI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Camera,
  FileText,
  Upload,
  Scan,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

type DetectionMethod = "image" | "symptom" | null;

interface SymptomOption {
  id: string;
  label: string;
  category: string;
}

const symptomOptions: SymptomOption[] = [
  { id: "yellow_leaves", label: "Yellow or pale leaves", category: "Leaves" },
  { id: "brown_spots", label: "Brown spots on leaves", category: "Leaves" },
  { id: "wilting", label: "Wilting or drooping", category: "Plant Structure" },
  { id: "curled_leaves", label: "Curled or twisted leaves", category: "Leaves" },
  { id: "white_powder", label: "White powdery coating", category: "Fungal" },
  { id: "black_spots", label: "Black spots or lesions", category: "Fungal" },
  { id: "stunted_growth", label: "Stunted growth", category: "Plant Structure" },
  { id: "fruit_rot", label: "Fruit rot or discoloration", category: "Fruit" },
  { id: "root_rot", label: "Root rot or decay", category: "Roots" },
  { id: "pest_damage", label: "Visible pest damage", category: "Pests" },
];

const DiseaseDetection = () => {
  const navigate = useNavigate();
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported format. Please upload a JPEG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image is too large. Please upload an image smaller than 10 MB.");
      e.target.value = "";
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  const canSubmit = () => {
    if (detectionMethod === "image") return selectedImage !== null;
    if (detectionMethod === "symptom") return selectedSymptoms.length > 0;
    return false;
  };

  const handleAnalyze = async () => {
    if (!canSubmit()) return;

    setAnalyzing(true);

    try {
      // Call AI-powered disease analysis via centralized backend
      const data = await callAI("disease-detection", {
        method: detectionMethod,
        imageBase64: detectionMethod === "image" ? imagePreview : null,
        symptoms: detectionMethod === "symptom"
          ? selectedSymptoms.map(s => symptomOptions.find(o => o.id === s)?.label)
          : null,
      });

      if (!data.success) {
        toast.error(data.error || "Analysis failed. Please try again.");
        return;
      }

      // Navigate to results page with AI analysis data
      navigate("/farmer/disease-result", {
        state: {
          method: detectionMethod,
          image: imagePreview,
          symptoms: selectedSymptoms,
          aiAnalysis: data.analysis,
        }
      });
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to analyze. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/farmer")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Disease Detection</h1>
            <p className="text-sm text-muted-foreground">Analyze your crop health</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Step 1: Choose Detection Method */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-xl font-semibold mb-2">Step 1: Choose Detection Method</h2>
          <p className="text-muted-foreground mb-4">
            Select how you'd like to identify the disease. You must choose ONE method.
          </p>

          <RadioGroup
            value={detectionMethod || ""}
            onValueChange={(value) => {
              setDetectionMethod(value as DetectionMethod);
              // Reset selections when method changes
              setSelectedImage(null);
              setImagePreview(null);
              setSelectedSymptoms([]);
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Image-Based Option */}
            <Label htmlFor="image" className="cursor-pointer">
              <Card className={`transition-all duration-300 ${detectionMethod === "image" ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary-lighter flex items-center justify-center">
                      <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <RadioGroupItem value="image" id="image" />
                  </div>
                  <CardTitle className="text-lg mt-3">Image-Based Detection</CardTitle>
                  <CardDescription>
                    Upload a photo of the affected leaf for AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-primary">High Confidence</Badge>
                </CardContent>
              </Card>
            </Label>

            {/* Symptom-Based Option */}
            <Label htmlFor="symptom" className="cursor-pointer">
              <Card className={`transition-all duration-300 ${detectionMethod === "symptom" ? "border-accent ring-2 ring-accent/20" : "hover:border-accent/50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-accent" />
                    </div>
                    <RadioGroupItem value="symptom" id="symptom" />
                  </div>
                  <CardTitle className="text-lg mt-3">Symptom-Based Detection</CardTitle>
                  <CardDescription>
                    Select observed symptoms for rule-based guidance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">Preliminary Guidance</Badge>
                </CardContent>
              </Card>
            </Label>
          </RadioGroup>
        </div>

        {/* Step 2: Provide Input */}
        {detectionMethod && (
          <div className="mb-8 animate-fade-in">
            <h2 className="text-xl font-semibold mb-2">Step 2: Provide Input</h2>

            {detectionMethod === "image" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" />
                    Upload Leaf Photo
                  </CardTitle>
                  <CardDescription>
                    Take a clear photo of the affected leaf for accurate analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative rounded-xl overflow-hidden border-2 border-primary">
                        <img
                          src={imagePreview}
                          alt="Selected leaf"
                          className="w-full h-64 object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        Image uploaded successfully
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                        <Upload className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="font-medium text-foreground">Click to upload image</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          JPG, PNG, or WebP — max 10 MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </label>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent" />
                    Select Symptoms
                  </CardTitle>
                  <CardDescription>
                    Choose all symptoms you've observed on your plants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {symptomOptions.map((symptom) => (
                      <label
                        key={symptom.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedSymptoms.includes(symptom.id)
                            ? "border-accent bg-accent/10"
                            : "border-transparent bg-muted/50 hover:bg-muted"
                          }`}
                      >
                        <Checkbox
                          checked={selectedSymptoms.includes(symptom.id)}
                          onCheckedChange={() => toggleSymptom(symptom.id)}
                        />
                        <div>
                          <p className="font-medium text-sm">{symptom.label}</p>
                          <p className="text-xs text-muted-foreground">{symptom.category}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedSymptoms.length > 0 && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                      {selectedSymptoms.length} symptom(s) selected
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Submit Button */}
        {detectionMethod && (
          <div className="animate-fade-in">
            <Button
              onClick={handleAnalyze}
              disabled={!canSubmit() || analyzing}
              variant={detectionMethod === "image" ? "farmer" : "merchant"}
              size="xl"
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5" />
                  Analyze {detectionMethod === "image" ? "Image" : "Symptoms"}
                </>
              )}
            </Button>

            {!canSubmit() && (
              <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {detectionMethod === "image"
                  ? "Please upload an image to continue"
                  : "Please select at least one symptom"
                }
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DiseaseDetection;
