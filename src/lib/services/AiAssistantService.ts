import { SymptomCheckerInput } from "../validation/ai";

export interface DepartmentRecommendation {
  departmentName: string;
  specialty: string;
  confidence: number; // 0.0 - 1.0
  reason: string;
  suggestedAction: string;
}

export interface SymptomAnalysisResult {
  isEmergency: boolean;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  emergencyMessage?: string | null;
  primaryRecommendation: DepartmentRecommendation;
  alternativeRecommendations: DepartmentRecommendation[];
  disclaimer: string;
  suggestedQuestionsForDoctor: string[];
}

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "heart attack",
  "cannot breathe",
  "can't breathe",
  "difficulty breathing",
  "shortness of breath",
  "severe breathlessness",
  "stroke",
  "face drooping",
  "slurred speech",
  "loss of consciousness",
  "fainted and not waking",
  "unresponsive",
  "severe bleeding",
  "coughing blood",
  "anaphylaxis",
  "swelling in throat",
  "poisoning",
  "sudden paralysis",
  "severe burn",
];

const DEPARTMENT_PATTERNS: {
  department: string;
  specialty: string;
  keywords: string[];
  reason: string;
}[] = [
  {
    department: "Cardiology",
    specialty: "Cardiologist",
    keywords: ["chest", "palpitation", "heart", "pulse", "bp", "blood pressure", "irregular heartbeat", "cholesterol", "angina"],
    reason: "Your symptoms relate to cardiovascular circulation and heart rhythm/pressure.",
  },
  {
    department: "Pediatrics",
    specialty: "Pediatrician",
    keywords: ["child", "baby", "infant", "toddler", "kid", "newborn", "son", "daughter", "colic"],
    reason: "Your query relates to child care and pediatric medical development.",
  },
  {
    department: "Dermatology",
    specialty: "Dermatologist",
    keywords: ["skin", "rash", "itching", "acne", "spots", "eczema", "hair loss", "scalp", "pigmentation", "mole", "allergy on skin"],
    reason: "Your symptoms indicate dermatological, epidermal, or hair conditions.",
  },
  {
    department: "Orthopedics",
    specialty: "Orthopedic Surgeon",
    keywords: ["bone", "joint", "knee", "spine", "back pain", "fracture", "ligament", "shoulder", "arthritis", "wrist", "ankle sprain", "swelling in leg"],
    reason: "Your symptoms indicate musculoskeletal, joint, or bone strain.",
  },
  {
    department: "Neurology",
    specialty: "Neurologist",
    keywords: ["migraine", "headache", "dizziness", "vertigo", "seizure", "numbness", "tingling", "tremor", "nerve pain", "memory loss"],
    reason: "Your symptoms suggest neurological or nervous system involvement.",
  },
  {
    department: "Ophthalmology",
    specialty: "Ophthalmologist",
    keywords: ["eye", "vision", "blurry", "cataract", "red eye", "double vision", "dry eyes", "stye", "cornea"],
    reason: "Your symptoms relate to ophthalmic vision and ocular health.",
  },
  {
    department: "ENT",
    specialty: "ENT Specialist",
    keywords: ["ear", "nose", "throat", "sinus", "tonsils", "hearing", "earache", "nasal congestion", "snoring", "hoarseness", "ear ringing"],
    reason: "Your symptoms involve ear, nose, throat, or upper respiratory pathways.",
  },
  {
    department: "Gastroenterology",
    specialty: "Gastroenterologist",
    keywords: ["stomach", "acidity", "gastric", "digestion", "vomiting", "nausea", "diarrhea", "constipation", "bloating", "abdominal pain", "reflux", "gerd", "liver"],
    reason: "Your symptoms relate to gastrointestinal and digestive system health.",
  },
  {
    department: "Dental",
    specialty: "Dentist",
    keywords: ["tooth", "teeth", "gum", "cavity", "jaw pain", "bleeding gums", "wisdom tooth", "root canal"],
    reason: "Your symptoms indicate dental or oral care requirements.",
  },
  {
    department: "Gynecology",
    specialty: "Gynecologist",
    keywords: ["period", "menstrual", "pregnancy", "cramps", "ovary", "pcos", "fertility", "uterus", "breast pain"],
    reason: "Your symptoms relate to reproductive health and gynecology.",
  },
  {
    department: "Psychiatry",
    specialty: "Psychiatrist / Psychologist",
    keywords: ["anxiety", "depression", "panic", "insomnia", "sleep disorder", "stress", "mood swings", "burnout", "mental health"],
    reason: "Your symptoms relate to mental health, mood, or sleep disturbances.",
  },
  {
    department: "General Medicine",
    specialty: "General Physician",
    keywords: ["fever", "cough", "cold", "body ache", "fatigue", "weakness", "chills", "infection", "weight loss", "general checkup"],
    reason: "Your symptoms are common general systemic indicators best assessed initially by a Physician.",
  },
];

export class AiAssistantService {
  /**
   * Analyze patient symptom description with emergency safety filter and department classifier
   */
  static analyzeSymptoms(input: SymptomCheckerInput): SymptomAnalysisResult {
    const text = input.symptoms.toLowerCase();

    // 1. Check Emergency Guardrails
    const isEmergency = EMERGENCY_KEYWORDS.some((kw) => text.includes(kw));

    if (isEmergency) {
      return {
        isEmergency: true,
        urgency: "CRITICAL",
        emergencyMessage:
          "CRITICAL HEALTH ALERT: Your described symptoms may require urgent medical intervention. Please call emergency services (108 / 911) or visit the nearest emergency room immediately.",
        primaryRecommendation: {
          departmentName: "Emergency & Trauma Care",
          specialty: "Emergency Medicine Specialist",
          confidence: 0.98,
          reason: "Critical symptoms detected that warrant immediate in-person triage.",
          suggestedAction: "Proceed directly to Hospital Emergency Department",
        },
        alternativeRecommendations: [
          {
            departmentName: "Cardiology",
            specialty: "Cardiologist",
            confidence: 0.85,
            reason: "Cardiovascular evaluation recommended if symptoms stabilize.",
            suggestedAction: "Urgent Specialist Consultation",
          },
        ],
        disclaimer:
          "MEDICAL DISCLAIMER: This automated assistant is for informational triage only and DOES NOT provide medical diagnosis. In case of acute or life-threatening symptoms, immediately contact emergency services.",
        suggestedQuestionsForDoctor: [
          "When did these severe symptoms first start?",
          "Are you experiencing any sweating, radiation of pain, or dizziness?",
        ],
      };
    }

    // 2. Score Departments
    const scores: {
      dept: (typeof DEPARTMENT_PATTERNS)[0];
      score: number;
    }[] = [];

    for (const pattern of DEPARTMENT_PATTERNS) {
      let matchedCount = 0;
      for (const kw of pattern.keywords) {
        if (text.includes(kw)) {
          matchedCount += 1;
        }
      }

      // Age modifiers (e.g. child -> boost pediatrics)
      if (input.age !== undefined && input.age < 14 && pattern.department === "Pediatrics") {
        matchedCount += 2;
      }

      if (matchedCount > 0) {
        scores.push({
          dept: pattern,
          score: matchedCount,
        });
      }
    }

    // Sort by matched score
    scores.sort((a, b) => b.score - a.score);

    // Fallback to General Medicine if no specific match
    const primaryDept = scores.length > 0 ? scores[0].dept : DEPARTMENT_PATTERNS.find((d) => d.department === "General Medicine")!;
    const secondaryDept = scores.length > 1 ? scores[1].dept : DEPARTMENT_PATTERNS.find((d) => d.department === "General Medicine" && d.department !== primaryDept.department);

    const confidence = scores.length > 0 ? Math.min(0.92, 0.65 + scores[0].score * 0.1) : 0.6;
    const urgency = text.includes("severe") || text.includes("high fever") || text.includes("unbearable") ? "HIGH" : "MEDIUM";

    return {
      isEmergency: false,
      urgency,
      emergencyMessage: null,
      primaryRecommendation: {
        departmentName: primaryDept.department,
        specialty: primaryDept.specialty,
        confidence: Number(confidence.toFixed(2)),
        reason: primaryDept.reason,
        suggestedAction: `Book an appointment with a ${primaryDept.specialty}`,
      },
      alternativeRecommendations: secondaryDept
        ? [
            {
              departmentName: secondaryDept.department,
              specialty: secondaryDept.specialty,
              confidence: Number((confidence * 0.8).toFixed(2)),
              reason: secondaryDept.reason,
              suggestedAction: `Consult a ${secondaryDept.specialty}`,
            },
          ]
        : [],
      disclaimer:
        "MEDICAL DISCLAIMER: This automated assistant is for informational triage and department recommendation only. It DOES NOT replace professional medical diagnosis, treatment, or clinical advice.",
      suggestedQuestionsForDoctor: [
        `How long have you been noticing these ${primaryDept.department.toLowerCase()} symptoms?`,
        "Have you taken any over-the-counter remedies or experienced changes recently?",
        "Are the symptoms persistent or do they come and go?",
      ],
    };
  }
}
