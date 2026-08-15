import { prisma } from "../db";
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

      return { doctors: [], total: 0 };
    } catch (dbError) {
      console.error("Database error in DoctorService.searchDoctors:", dbError);
      throw dbError;
    }
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

      return null;
    } catch (dbError) {
      console.error("Database error in DoctorService.getDoctorById:", dbError);
      throw dbError;
    }
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

      const specialties = Array.from(new Set(departments.map((d) => d.name)));
      return { specialties, branches, departments };
    } catch (dbError) {
      console.error("Database error in DoctorService.getFilterOptions:", dbError);
      throw dbError;
    }
  }
}
