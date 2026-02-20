import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Pill,
  Calculator,
  Droplets,
  MapPin,
  Download,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Navigation
} from "lucide-react";

// Fallback disease data (symptom-based only) - prices come from API, not hardcoded
const diseaseDatabase: Record<string, {
  name: string;
  description: string;
  severity: "low" | "medium" | "high";
  treatments: { name: string; unit: string; dosagePerAcre: number }[];
  applicationGuide: { step: string; timing: string }[];
}> = {
  "yellow_leaves": {
    name: "Nitrogen Deficiency",
    description: "Plants show yellowing of older leaves, starting from the tips and moving inward.",
    severity: "medium",
    treatments: [
      { name: "Urea (46-0-0)", unit: "kg", dosagePerAcre: 50 },
      { name: "Ammonium Nitrate", unit: "kg", dosagePerAcre: 40 },
    ],
    applicationGuide: [
      { step: "Apply fertilizer in the morning when soil is moist", timing: "Early morning" },
      { step: "Spread evenly around plant base, avoiding direct contact", timing: "Within 2 days" },
      { step: "Water lightly after application", timing: "Immediately after" },
    ],
  },
  "brown_spots": {
    name: "Leaf Spot Disease",
    description: "Fungal infection causing brown or black spots on leaves with yellow halos.",
    severity: "high",
    treatments: [
      { name: "Mancozeb Fungicide", unit: "kg", dosagePerAcre: 2.5 },
      { name: "Copper Oxychloride", unit: "kg", dosagePerAcre: 3 },
    ],
    applicationGuide: [
      { step: "Remove and destroy infected leaves first", timing: "Before treatment" },
      { step: "Mix fungicide with water as per label instructions", timing: "Preparation" },
      { step: "Spray evenly on all plant surfaces", timing: "Every 7-10 days" },
    ],
  },
  "default": {
    name: "General Plant Stress",
    description: "Plants showing signs of stress that may be caused by multiple factors.",
    severity: "low",
    treatments: [
      { name: "NPK 10-26-26", unit: "kg", dosagePerAcre: 2 },
      { name: "Organic Compost", unit: "kg", dosagePerAcre: 100 },
    ],
    applicationGuide: [
      { step: "Assess soil moisture and drainage", timing: "First" },
      { step: "Apply balanced fertilizer", timing: "Week 1" },
      { step: "Monitor plant recovery", timing: "Ongoing" },
    ],
  },
};

// Mock nearby shops
const nearbyShops = [
  { id: 1, name: "Kisan Agro Store", address: "Main Market, Sector 15", phone: "+91 98765 43210", distance: "1.2 km" },
  { id: 2, name: "Green Fertilizers", address: "Agricultural Hub, Ring Road", phone: "+91 87654 32109", distance: "2.5 km" },
  { id: 3, name: "Farmer's Choice", address: "Village Center", phone: "+91 76543 21098", distance: "3.8 km" },
];

const DiseaseResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { method, image, symptoms, aiAnalysis } = location.state || {};

  const [landAcres, setLandAcres] = useState<number>(1);

  // Use AI analysis if available, otherwise fallback to rule-based
  const getDiseaseInfo = () => {
    if (aiAnalysis) {
      return {
        name: aiAnalysis.disease_name || "Unknown Disease",
        description: aiAnalysis.description || "Analysis completed.",
        severity: aiAnalysis.severity || "medium",
        treatments: aiAnalysis.treatments || [],
        applicationGuide: aiAnalysis.applicationGuide || [],
        preventionTips: aiAnalysis.preventionTips || [],
      };
    }

    if (method === "symptom" && symptoms?.length > 0) {
      const primarySymptom = symptoms[0];
      return diseaseDatabase[primarySymptom] || diseaseDatabase["default"];
    }
    return diseaseDatabase["default"];
  };

  const disease = getDiseaseInfo();
  const confidence = aiAnalysis?.confidence || (method === "image" ? "high" : "medium");

  const calculateCosts = (treatment: any) => {
    // If pricing comes from API-enriched data (new format)
    if (treatment.pricingAvailable !== undefined) {
      return {
        quantity: treatment.requiredQuantity || `${(treatment.dosagePerAcre || 0) * landAcres} ${treatment.unit || "kg"}`,
        totalCost: treatment.totalCost != null ? treatment.totalCost * landAcres : null,
        unitPrice: treatment.unitPrice,
        currency: treatment.currency || "INR",
        pricingAvailable: treatment.pricingAvailable,
        estimatedProfit: treatment.totalCost != null ? treatment.totalCost * landAcres * 3 : null,
      };
    }

    // Legacy fallback (symptom-based without API enrichment)
    const qty = (treatment.dosagePerAcre || 0) * landAcres;
    return {
      quantity: `${qty.toFixed(2)} ${treatment.unit || "kg"}`,
      totalCost: null,
      unitPrice: null,
      currency: "INR",
      pricingAvailable: false,
      estimatedProfit: null,
    };
  };

  const handleDownloadPrescription = () => {
    // In production, this would generate a PDF
    const prescription = {
      date: new Date().toLocaleDateString(),
      location: "User's Location",
      disease: disease.name,
      severity: disease.severity,
      weather: "28°C, 65% humidity",
      treatments: disease.treatments.map(t => ({
        ...t,
        ...calculateCosts(t),
      })),
    };

    // Create a simple text download for now
    const content = `
KisanSetu Disease Prescription
==============================
Date: ${prescription.date}
Disease Detected: ${prescription.disease}
Severity: ${prescription.severity}
Weather Conditions: ${prescription.weather}
Land Area: ${landAcres} acres

Recommended Treatments:
${prescription.treatments.map((t: any) => `
- ${t.product || t.name}
  Quantity: ${t.quantity}
  Cost: ${t.totalCost != null ? `₹${t.totalCost.toFixed(2)}` : "N/A"}
`).join('')}

Generated by KisanSetu - The Farmer's Bridge
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/farmer/disease-detection")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Detection Results</h1>
            <p className="text-sm text-muted-foreground">
              {method === "image" ? "Image-based" : "Symptom-based"} analysis
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Disease Card */}
        <Card className="mb-6 animate-fade-in overflow-hidden">
          {method === "image" && image && (
            <div className="h-48 bg-muted">
              <img src={image} alt="Analyzed leaf" className="w-full h-full object-cover" />
            </div>
          )}
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${disease.severity === "high" ? "bg-destructive/20" :
                  disease.severity === "medium" ? "bg-warning/20" : "bg-primary-lighter"
                  }`}>
                  <Leaf className={`w-6 h-6 ${disease.severity === "high" ? "text-destructive" :
                    disease.severity === "medium" ? "text-warning" : "text-primary"
                    }`} />
                </div>
                <div>
                  <CardTitle className="text-xl">{disease.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {method === "image" ? "Image-based detection" : "Preliminary guidance (symptom-based)"}
                  </CardDescription>
                </div>
              </div>
              <Badge className={
                confidence === "high" ? "bg-primary" : "bg-warning text-warning-foreground"
              }>
                {confidence === "high" ? "High" : "Medium"} Confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{disease.description}</p>
            <div className="mt-4 flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${disease.severity === "high" ? "text-destructive" :
                disease.severity === "medium" ? "text-warning" : "text-muted-foreground"
                }`} />
              <span className="text-sm capitalize">
                Severity: <strong>{disease.severity}</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Action Tabs */}
        <Tabs defaultValue="treatment" className="animate-fade-in">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="treatment" className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Treatment
            </TabsTrigger>
            <TabsTrigger value="guidance" className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Guidance
            </TabsTrigger>
            <TabsTrigger value="shops" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Shops
            </TabsTrigger>
          </TabsList>

          {/* Treatment Tab */}
          <TabsContent value="treatment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Treatment & Cost Calculation
                </CardTitle>
                <CardDescription>
                  Enter your land area to calculate product requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Land Input */}
                <div className="space-y-2">
                  <Label htmlFor="land">Land Area (acres)</Label>
                  <Input
                    id="land"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={landAcres}
                    onChange={(e) => setLandAcres(parseFloat(e.target.value) || 1)}
                    className="max-w-[200px]"
                  />
                </div>

                {/* Treatment Options */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Recommended Products</h4>
                  {disease.treatments.map((treatment: any, index: number) => {
                    const costs = calculateCosts(treatment);
                    return (
                      <div
                        key={index}
                        className="p-4 rounded-xl bg-muted/50 border space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium">{treatment.product || treatment.name}</h5>
                            {costs.pricingAvailable && costs.unitPrice != null ? (
                              <p className="text-sm text-muted-foreground">
                                ₹{costs.unitPrice} per {treatment.unit || "kg"}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Pricing unavailable
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!costs.pricingAvailable && (
                              <Badge variant="secondary" className="text-xs">No price</Badge>
                            )}
                            <Badge variant="outline">Option {index + 1}</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Required Qty</p>
                            <p className="font-semibold">{costs.quantity}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Cost</p>
                            <p className="font-semibold text-primary">
                              {costs.totalCost != null ? `₹${costs.totalCost.toFixed(2)}` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Est. Savings</p>
                            <p className="font-semibold text-success">
                              {costs.estimatedProfit != null ? `₹${costs.estimatedProfit.toFixed(2)}` : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Download Button */}
                <Button onClick={handleDownloadPrescription} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Prescription (PDF)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Application Guidance Tab */}
          <TabsContent value="guidance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-primary" />
                  Application Guidance
                </CardTitle>
                <CardDescription>
                  How to properly apply the treatment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {disease.applicationGuide.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 pb-4 border-b last:border-0">
                        <p className="font-medium">{step.step}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Timing: {step.timing}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    Weather Consideration
                  </h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on current weather (65% humidity, 20% rain chance), apply treatment
                    in early morning for best absorption. Avoid application if rain is expected
                    within 4 hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nearby Shops Tab */}
          <TabsContent value="shops">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Nearby Agricultural Shops
                </CardTitle>
                <CardDescription>
                  Find the recommended products at these locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {nearbyShops.map((shop) => (
                    <div
                      key={shop.id}
                      className="p-4 rounded-xl bg-muted/50 border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{shop.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{shop.address}</p>
                        </div>
                        <Badge variant="secondary">{shop.distance}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-4">
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <a href={`tel:${shop.phone}`}>
                            <Phone className="w-4 h-4 mr-2" />
                            Call
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Navigation className="w-4 h-4 mr-2" />
                          Directions
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Button
            variant="farmer"
            size="lg"
            className="w-full"
            onClick={() => navigate("/farmer")}
          >
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};

export default DiseaseResult;
