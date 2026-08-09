import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";
import { DoctorSearchInput } from "../validation/doctor";

export interface DoctorDTO {
  id: string;
  name: string;
  specialty: string;
  bio?: string | null;
  qualifications?: string | null;
  experience?: number | null;
  fee: number;
  language: string[];
  photoUrl?: string | null;
  appointmentDurationMin: number;
  department: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
    address?: string | null;
  };
  averageRating: number;
  totalReviews: number;
  nextAvailableSlot?: string | null;
}

// In-memory demo store for fallback during local development when DB is not running
const memoryDoctors: DoctorDTO[] = [
  {
    id: "doc_patel_01",
    name: "Dr. Rajesh Patel",
    specialty: "Cardiology",
    bio: "Senior Interventional Cardiologist with over 15 years of experience in coronary interventions and preventive cardiology.",
    qualifications: "MD (Cardiology), DM, FACC",
    experience: 15,
    fee: 800,
    language: ["English", "Hindi", "Gujarati"],
    photoUrl: null,
    appointmentDurationMin: 20,
    department: { id: "dept_cardio_01", name: "Cardiology" },
    branch: { id: "branch_main_01", name: "MediFlow Central Hospital", address: "123 Healthcare Ave, Mumbai" },
    averageRating: 4.9,
    totalReviews: 124,
    nextAvailableSlot: "Today, 10:20 AM",
  },
  {
    id: "doc_ananya_02",
    name: "Dr. Ananya Roy",
    specialty: "Dermatology",
    bio: "Consultant Dermatologist and Aesthetician specializing in clinical dermatology, allergy testing, and laser therapies.",
    qualifications: "MBBS, MD (Dermatology, Venereology & Leprosy)",
    experience: 10,
    fee: 650,
    language: ["English", "Hindi", "Bengali"],
    photoUrl: null,
    appointmentDurationMin: 15,
    department: { id: "dept_derm_02", name: "Dermatology" },
    branch: { id: "branch_main_01", name: "MediFlow Central Hospital", address: "123 Healthcare Ave, Mumbai" },
    averageRating: 4.8,
    totalReviews: 98,
    nextAvailableSlot: "Today, 11:00 AM",
  },
  {
    id: "doc_vikram_03",
    name: "Dr. Vikram Seth",
    specialty: "Orthopedics",
    bio: "Chief Orthopedic Surgeon specializing in joint replacement, sports injury rehabilitation, and arthroscopic surgery.",
    qualifications: "MS (Orthopedics), MCh, Fellowship in Joint Replacement",
    experience: 18,
    fee: 900,
    language: ["English", "Hindi", "Marathi"],
    photoUrl: null,
    appointmentDurationMin: 20,
    department: { id: "dept_ortho_03", name: "Orthopedics" },
    branch: { id: "branch_north_02", name: "MediFlow North Clinic", address: "45 Wellness Road, Mumbai" },
    averageRating: 4.9,
    totalReviews: 156,
    nextAvailableSlot: "Tomorrow, 09:30 AM",
  },
  {
    id: "doc_sneha_04",
    name: "Dr. Sneha Kulkarni",
    specialty: "Pediatrics",
    bio: "Dedicated Pediatrician and Child Health Specialist with expertise in neonatal care, growth monitoring, and pediatric immunization.",
    qualifications: "MBBS, DCH, DNB (Pediatrics)",
    experience: 12,
    fee: 600,
    language: ["English", "Hindi", "Marathi"],
    photoUrl: null,
    appointmentDurationMin: 20,
    department: { id: "dept_pedia_04", name: "Pediatrics" },
    branch: { id: "branch_main_01", name: "MediFlow Central Hospital", address: "123 Healthcare Ave, Mumbai" },
    averageRating: 4.9,
    totalReviews: 210,
    nextAvailableSlot: "Today, 02:00 PM",
  },
  {
    id: "doc_arjun_05",
    name: "Dr. Arjun Mehta",
    specialty: "Neurology",
    bio: "Neurology Specialist focusing on headache disorders, stroke prevention, epilepsy management, and neuro-rehabilitation.",
    qualifications: "MD, DM (Neurology)",
    experience: 14,
    fee: 1000,
    language: ["English", "Hindi", "Gujarati"],
    photoUrl: null,
    appointmentDurationMin: 30,
    department: { id: "dept_neuro_05", name: "Neurology" },
    branch: { id: "branch_north_02", name: "MediFlow North Clinic", address: "45 Wellness Road, Mumbai" },
    averageRating: 4.7,
    totalReviews: 82,
    nextAvailableSlot: "Tomorrow, 11:30 AM",
  },
  {
    id: "doc_pooja_06",
    name: "Dr. Pooja Iyer",
    specialty: "Gynecology",
    bio: "Senior Obstetrician and Gynaecologist with deep expertise in high-risk pregnancy care, fertility guidance, and laparoscopic surgery.",
    qualifications: "MS (OBG), DNB, FICOG",
    experience: 16,
    fee: 750,
    language: ["English", "Hindi", "Tamil"],
    photoUrl: null,
    appointmentDurationMin: 20,
    department: { id: "dept_gyn_06", name: "Gynecology & Obstetrics" },
    branch: { id: "branch_main_01", name: "MediFlow Central Hospital", address: "123 Healthcare Ave, Mumbai" },
    averageRating: 4.9,
    totalReviews: 188,
    nextAvailableSlot: "Today, 03:30 PM",
  },
];

export class DoctorService {
  /**
   * Search and filter doctors with pagination
   */
  static async searchDoctors(filters: DoctorSearchInput): Promise<{
    doctors: DoctorDTO[];
    total: number;
  }> {
    try {
      const where: Record<string, unknown> = {
        isActive: true,
      };

      if (filters.specialty) {
        where.specialty = { contains: filters.specialty, mode: "insensitive" };
      }

      if (filters.departmentId) {
        where.departmentId = filters.departmentId;
      }

      if (filters.branchId) {
        where.department = {
          branchId: filters.branchId,
        };
      }

      if (filters.language) {
        where.language = { has: filters.language };
      }

      if (filters.minFee !== undefined || filters.maxFee !== undefined) {
        where.fee = {
          ...(filters.minFee !== undefined ? { gte: filters.minFee } : {}),
          ...(filters.maxFee !== undefined ? { lte: filters.maxFee } : {}),
        };
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { specialty: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const [doctors, total] = await Promise.all([
        prisma.doctor.findMany({
          where,
          include: {
            department: {
              include: { branch: true },
            },
            reviews: {
              select: { rating: true },
            },
          },
          take: filters.limit || 20,
        }),
        prisma.doctor.count({ where }),
      ]);

      if (doctors.length > 0) {
        const formatted: DoctorDTO[] = doctors.map((doc) => {
          const totalReviews = doc.reviews.length;
          const avgRating = totalReviews > 0
            ? doc.reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews
            : 4.8;

          return {
            id: doc.id,
            name: doc.name,
            specialty: doc.specialty,
            bio: doc.bio,
            qualifications: doc.qualifications,
            experience: doc.experience,
            fee: Number(doc.fee),
            language: doc.language,
            photoUrl: doc.photoUrl,
            appointmentDurationMin: doc.appointmentDurationMin,
            department: {
              id: doc.department.id,
              name: doc.department.name,
            },
            branch: {
              id: doc.department.branch.id,
              name: doc.department.branch.name,
              address: doc.department.branch.address,
            },
            averageRating: Math.round(avgRating * 10) / 10,
            totalReviews,
            nextAvailableSlot: "Available Today",
          };
        });

        return { doctors: formatted, total };
      }

      if (!ALLOW_MEMORY_FALLBACK) {
        return { doctors: [], total: 0 };
      }
    } catch (dbError) {
      console.error("Database error in DoctorService.searchDoctors:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
      console.warn("Falling back to in-memory doctor list in dev mode");
    }

    // In-memory filter fallback
    let filtered = [...memoryDoctors];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)
      );
    }

    if (filters.specialty) {
      filtered = filtered.filter((d) => d.specialty.toLowerCase().includes(filters.specialty!.toLowerCase()));
    }

    if (filters.departmentId) {
      filtered = filtered.filter((d) => d.department.id === filters.departmentId);
    }

    if (filters.branchId) {
      filtered = filtered.filter((d) => d.branch.id === filters.branchId);
    }

    if (filters.language) {
      filtered = filtered.filter((d) => d.language.some((l) => l.toLowerCase() === filters.language!.toLowerCase()));
    }

    if (filters.minFee !== undefined) {
      filtered = filtered.filter((d) => d.fee >= filters.minFee!);
    }

    if (filters.maxFee !== undefined) {
      filtered = filtered.filter((d) => d.fee <= filters.maxFee!);
    }

    return {
      doctors: filtered.slice(0, filters.limit || 20),
      total: filtered.length,
    };
  }

  /**
   * Get doctor profile by ID
   */
  static async getDoctorById(id: string): Promise<DoctorDTO | null> {
    try {
      const doc = await prisma.doctor.findUnique({
        where: { id },
        include: {
          department: {
            include: { branch: true },
          },
          reviews: {
            select: { rating: true, comment: true, createdAt: true },
          },
        },
      });

      if (doc) {
        const totalReviews = doc.reviews.length;
        const avgRating = totalReviews > 0
          ? doc.reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews
          : 4.9;

        return {
          id: doc.id,
          name: doc.name,
          specialty: doc.specialty,
          bio: doc.bio,
          qualifications: doc.qualifications,
          experience: doc.experience,
          fee: Number(doc.fee),
          language: doc.language,
          photoUrl: doc.photoUrl,
          appointmentDurationMin: doc.appointmentDurationMin,
          department: {
            id: doc.department.id,
            name: doc.department.name,
          },
          branch: {
            id: doc.department.branch.id,
            name: doc.department.branch.name,
            address: doc.department.branch.address,
          },
          averageRating: Math.round(avgRating * 10) / 10,
          totalReviews,
          nextAvailableSlot: "Available Today",
        };
      }

      if (!ALLOW_MEMORY_FALLBACK) return null;
    } catch (dbError) {
      console.error("Database error in DoctorService.getDoctorById:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
      console.warn("Falling back to in-memory doctor lookup in dev mode");
    }

    const memDoc = memoryDoctors.find((d) => d.id === id);
    return memDoc || null;
  }

  /**
   * Get all active specialties and branches for filter dropdowns
   */
  static async getFilterOptions(): Promise<{
    specialties: string[];
    branches: { id: string; name: string }[];
    departments: { id: string; name: string }[];
  }> {
    try {
      const [departments, branches] = await Promise.all([
        prisma.department.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
        }),
        prisma.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
        }),
      ]);

      if (departments.length > 0 || branches.length > 0) {
        const specialties = Array.from(new Set(departments.map((d) => d.name)));
        return { specialties, branches, departments };
      }

      if (!ALLOW_MEMORY_FALLBACK) {
        return { specialties: [], branches: [], departments: [] };
      }
    } catch (dbError) {
      console.error("Database error in DoctorService.getFilterOptions:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // Fallback options
    const specialties = Array.from(new Set(memoryDoctors.map((d) => d.specialty)));
    const branches = [
      { id: "branch_main_01", name: "MediFlow Central Hospital" },
      { id: "branch_north_02", name: "MediFlow North Clinic" },
    ];
    const departments = [
      { id: "dept_cardio_01", name: "Cardiology" },
      { id: "dept_derm_02", name: "Dermatology" },
      { id: "dept_ortho_03", name: "Orthopedics" },
      { id: "dept_pedia_04", name: "Pediatrics" },
      { id: "dept_neuro_05", name: "Neurology" },
      { id: "dept_gyn_06", name: "Gynecology & Obstetrics" },
    ];

    return { specialties, branches, departments };
  }
}
