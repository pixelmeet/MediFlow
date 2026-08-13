import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import type {
  CreateDoctorAdminInput,
  UpdateDoctorAdminInput,
  DepartmentAdminInput,
  BranchAdminInput,
  UpdateBranchAdminInput,
  AppointmentOverrideInput,
} from "../validation/admin";

export interface AdminOverviewDTO {
  stats: {
    totalAppointmentsToday: number;
    activeConsultations: number;
    completedToday: number;
    cancelledToday: number;
    noShowToday: number;
    activeDoctorsCount: number;
    activeDepartmentsCount: number;
    totalRevenueToday: number;
  };
  departmentBreakdown: {
    id: string;
    name: string;
    doctorCount: number;
    appointmentCount: number;
  }[];
  doctorUtilization: {
    id: string;
    name: string;
    specialty: string;
    bookedSlots: number;
    totalCapacity: number;
    utilizationPercent: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }[];
}

export interface AdminDoctorDTO {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  departmentId: string;
  departmentName: string;
  branchName: string;
  languages: string[];
  appointmentDurationMin: number;
  isActive: boolean;
  activeAppointmentsCount: number;
}

export interface AdminAppointmentDTO {
  id: string;
  tokenNumber: string;
  patientName: string;
  patientPhone?: string | null;
  doctorName: string;
  doctorId: string;
  specialty: string;
  branchName: string;
  date: string;
  startTime: string;
  status: string;
  feeSnapshot: number;
  checkedInAt?: string | null;
  paymentStatus?: string | null;
  refundedAt?: string | null;
}

export class AdminService {
  /**
   * Fetch high-level admin dashboard overview metrics
   */
  static async getAdminOverview(branchId?: string): Promise<AdminOverviewDTO> {
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    try {
      const whereToday = {
        date: { gte: today, lt: tomorrow },
        ...(branchId ? { branchId } : {}),
      };

      const [
        totalAppointments,
        inConsultation,
        completed,
        cancelled,
        noShow,
        doctors,
        departments,
        todayAppointmentsList,
      ] = await Promise.all([
        prisma.appointment.count({ where: whereToday }),
        prisma.appointment.count({ where: { ...whereToday, status: "IN_CONSULTATION" } }),
        prisma.appointment.count({ where: { ...whereToday, status: "COMPLETED" } }),
        prisma.appointment.count({ where: { ...whereToday, status: "CANCELLED" } }),
        prisma.appointment.count({ where: { ...whereToday, status: "NO_SHOW" } }),
        prisma.doctor.findMany({
          where: { isActive: true },
          include: { department: true },
        }),
        prisma.department.findMany({
          where: { isActive: true, ...(branchId ? { branchId } : {}) },
          include: { doctors: true },
        }),
        prisma.appointment.findMany({
          where: whereToday,
          select: { doctorId: true, feeSnapshot: true, branchId: true },
        }),
      ]);

      // Calculate Revenue
      const totalRevenueToday = todayAppointmentsList.reduce(
        (sum, a) => sum + Number(a.feeSnapshot || 0),
        0
      );

      // Department breakdown
      const departmentBreakdown = departments.map((d) => {
        const aptCount = todayAppointmentsList.filter((a) =>
          d.doctors.some((doc) => doc.id === a.doctorId)
        ).length;
        return {
          id: d.id,
          name: d.name,
          doctorCount: d.doctors.length,
          appointmentCount: aptCount,
        };
      });

      // Doctor utilization
      const doctorUtilization = doctors.slice(0, 6).map((doc) => {
        const booked = todayAppointmentsList.filter((a) => a.doctorId === doc.id).length;
        const capacity = Math.max(16, booked); // Default ~16 slots per 6-hour shift
        const percent = Math.min(100, Math.round((booked / capacity) * 100));
        return {
          id: doc.id,
          name: doc.name,
          specialty: doc.specialty,
          bookedSlots: booked,
          totalCapacity: capacity,
          utilizationPercent: percent,
        };
      });

      return {
        stats: {
          totalAppointmentsToday: totalAppointments,
          activeConsultations: inConsultation,
          completedToday: completed,
          cancelledToday: cancelled,
          noShowToday: noShow,
          activeDoctorsCount: doctors.length,
          activeDepartmentsCount: departments.length,
          totalRevenueToday,
        },
        departmentBreakdown,
        doctorUtilization,
        recentActivity: [
          {
            id: "act_1",
            type: "APPOINTMENT",
            description: "New appointment booked for Cardiology (Dr. Rajesh Patel)",
            timestamp: "5 mins ago",
          },
          {
            id: "act_2",
            type: "CONSULTATION",
            description: "Consultation completed for Token A-01",
            timestamp: "18 mins ago",
          },
          {
            id: "act_3",
            type: "SYSTEM",
            description: "Daily queue synchronized across all branches",
            timestamp: "1 hour ago",
          },
        ],
      };
    } catch (dbError) {
      console.error("Database error in getAdminOverview:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // Dev fallback
    return {
      stats: {
        totalAppointmentsToday: 28,
        activeConsultations: 3,
        completedToday: 14,
        cancelledToday: 2,
        noShowToday: 1,
        activeDoctorsCount: 8,
        activeDepartmentsCount: 5,
        totalRevenueToday: 16800,
      },
      departmentBreakdown: [
        { id: "dept_1", name: "Cardiology", doctorCount: 3, appointmentCount: 12 },
        { id: "dept_2", name: "Orthopedics", doctorCount: 2, appointmentCount: 8 },
        { id: "dept_3", name: "General Medicine", doctorCount: 3, appointmentCount: 8 },
      ],
      doctorUtilization: [
        {
          id: "doc_patel_01",
          name: "Dr. Rajesh Patel",
          specialty: "Cardiology",
          bookedSlots: 12,
          totalCapacity: 16,
          utilizationPercent: 75,
        },
        {
          id: "doc_sharma_02",
          name: "Dr. Sneha Kulkarni",
          specialty: "General Medicine",
          bookedSlots: 8,
          totalCapacity: 16,
          utilizationPercent: 50,
        },
      ],
      recentActivity: [
        {
          id: "act_1",
          type: "APPOINTMENT",
          description: "New appointment booked for Cardiology",
          timestamp: "10 mins ago",
        },
        {
          id: "act_2",
          type: "QUEUE",
          description: "Patient Token A-02 checked in at Central Clinic",
          timestamp: "25 mins ago",
        },
      ],
    };
  }

  /**
   * List doctors with filters and pagination for Admin directory
   */
  static async listDoctors(params?: {
    search?: string;
    departmentId?: string;
    branchId?: string;
  }): Promise<AdminDoctorDTO[]> {
    try {
      const doctors = await prisma.doctor.findMany({
        where: {
          ...(params?.departmentId ? { departmentId: params.departmentId } : {}),
          ...(params?.branchId ? { department: { branchId: params.branchId } } : {}),
          ...(params?.search
            ? {
                OR: [
                  { name: { contains: params.search, mode: "insensitive" } },
                  { specialty: { contains: params.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          user: true,
          department: {
            include: { branch: true },
          },
          appointments: {
            where: { status: { in: ["CONFIRMED", "CHECKED_IN", "WAITING", "IN_CONSULTATION"] } },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (doctors.length > 0) {
        return doctors.map((d) => ({
          id: d.id,
          userId: d.userId,
          name: d.name,
          email: d.user.email || "",
          phone: d.user.phone || "",
          specialty: d.specialty,
          qualifications: d.qualifications || "MBBS",
          experienceYears: d.experience || 5,
          consultationFee: Number(d.fee || 500),
          departmentId: d.departmentId,
          departmentName: d.department.name,
          branchName: d.department.branch.name,
          languages: d.language || ["English", "Hindi"],
          appointmentDurationMin: d.appointmentDurationMin || 20,
          isActive: d.isActive,
          activeAppointmentsCount: d.appointments.length,
        }));
      }

      if (!ALLOW_MEMORY_FALLBACK) return [];
    } catch (dbError) {
      console.error("Database error in listDoctors:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // Dev fallback
    return [
      {
        id: "doc_patel_01",
        userId: "usr_doc_01",
        name: "Dr. Rajesh Patel",
        email: "rajesh.patel@mediflow.com",
        phone: "+91 98201 11223",
        specialty: "Cardiology",
        qualifications: "MBBS, MD (Cardiology)",
        experienceYears: 14,
        consultationFee: 700,
        departmentId: "dept_cardio",
        departmentName: "Cardiology",
        branchName: "Central Hospital - Main Branch",
        languages: ["English", "Hindi", "Gujarati"],
        appointmentDurationMin: 20,
        isActive: true,
        activeAppointmentsCount: 6,
      },
      {
        id: "doc_kulkarni_02",
        userId: "usr_doc_02",
        name: "Dr. Sneha Kulkarni",
        email: "sneha.kulkarni@mediflow.com",
        phone: "+91 98202 33445",
        specialty: "General Medicine",
        qualifications: "MBBS, DNB (Internal Medicine)",
        experienceYears: 9,
        consultationFee: 500,
        departmentId: "dept_gen",
        departmentName: "General Medicine",
        branchName: "Central Hospital - Main Branch",
        languages: ["English", "Hindi", "Marathi"],
        appointmentDurationMin: 15,
        isActive: true,
        activeAppointmentsCount: 4,
      },
    ];
  }

  /**
   * Create a new Doctor profile and linked User record
   */
  static async createDoctor(
    input: CreateDoctorAdminInput
  ): Promise<{ success: boolean; doctorId?: string; error?: string }> {
    try {
      const created = await prisma.$transaction(async (tx) => {
        // 1. Create or find User
        const user = await tx.user.create({
          data: {
            email: input.email,
            phone: input.phone,
            role: "DOCTOR",
            isVerified: true,
            isActive: true,
          },
        });

        // 2. Create Doctor record
        const doctor = await tx.doctor.create({
          data: {
            userId: user.id,
            departmentId: input.departmentId,
            name: input.name,
            specialty: input.specialty,
            qualifications: input.qualifications,
            experience: input.experienceYears,
            fee: input.consultationFee,
            language: input.languages,
            appointmentDurationMin: input.appointmentDurationMin,
            isActive: true,
          },
        });

        // 3. Create default weekly availability (Mon-Sat 09:00 - 17:00, break 13:00 - 14:00)
        for (let day = 1; day <= 6; day++) {
          await tx.doctorAvailability.create({
            data: {
              doctorId: doctor.id,
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "17:00",
              breakStart: "13:00",
              breakEnd: "14:00",
            },
          });
        }

        return doctor;
      });

      return { success: true, doctorId: created.id };
    } catch (dbError) {
      console.error("Database error creating doctor:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error creating doctor" };
      }
      return { success: true, doctorId: `doc_${Date.now()}` };
    }
  }

  /**
   * Update doctor details, fee, or department
   */
  static async updateDoctor(
    doctorId: string,
    input: UpdateDoctorAdminInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.$transaction(async (tx) => {
        const doctor = await tx.doctor.update({
          where: { id: doctorId },
          data: {
            name: input.name,
            specialty: input.specialty,
            qualifications: input.qualifications,
            experience: input.experienceYears,
            fee: input.consultationFee,
            departmentId: input.departmentId,
            language: input.languages,
            appointmentDurationMin: input.appointmentDurationMin,
            isActive: input.isActive,
          },
        });

        if (input.email || input.phone) {
          await tx.user.update({
            where: { id: doctor.userId },
            data: {
              email: input.email,
              phone: input.phone,
            },
          });
        }
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error updating doctor:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Failed to update doctor profile" };
      }
      return { success: true };
    }
  }

  /**
   * Delete or deactivate doctor with conflict resolution for upcoming appointments
   */
  static async deleteDoctor(
    doctorId: string,
    resolution: "CANCEL_APPOINTMENTS" | "REASSIGN",
    reassignDoctorId?: string
  ): Promise<{ success: boolean; affectedAppointmentsCount?: number; error?: string }> {
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

    try {
      const activeAppointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          date: { gte: today },
          status: { in: ["CONFIRMED", "WAITING", "CHECKED_IN"] },
        },
      });

      await prisma.$transaction(async (tx) => {
        if (activeAppointments.length > 0) {
          if (resolution === "CANCEL_APPOINTMENTS") {
            await tx.appointment.updateMany({
              where: {
                doctorId,
                date: { gte: today },
                status: { in: ["CONFIRMED", "WAITING", "CHECKED_IN"] },
              },
              data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelReason: "Doctor removed from hospital directory by administration",
              },
            });
          } else if (resolution === "REASSIGN" && reassignDoctorId) {
            await tx.appointment.updateMany({
              where: {
                doctorId,
                date: { gte: today },
                status: { in: ["CONFIRMED", "WAITING", "CHECKED_IN"] },
              },
              data: {
                doctorId: reassignDoctorId,
              },
            });
          }
        }

        // Soft delete / deactivate doctor
        await tx.doctor.update({
          where: { id: doctorId },
          data: { isActive: false },
        });
      });

      return { success: true, affectedAppointmentsCount: activeAppointments.length };
    } catch (dbError) {
      console.error("Database error in deleteDoctor:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Failed to delete/deactivate doctor" };
      }
      return { success: true, affectedAppointmentsCount: 0 };
    }
  }

  /**
   * List all departments
   */
  static async listDepartments(branchId?: string) {
    try {
      const departments = await prisma.department.findMany({
        where: {
          isActive: true,
          ...(branchId ? { branchId } : {}),
        },
        include: {
          branch: true,
          doctors: { select: { id: true, name: true, specialty: true } },
        },
      });

      if (departments.length > 0) {
        return departments.map((d) => ({
          id: d.id,
          name: d.name,
          branchId: d.branchId,
          branchName: d.branch.name,
          doctorCount: d.doctors.length,
          doctors: d.doctors,
        }));
      }

      if (!ALLOW_MEMORY_FALLBACK) return [];
    } catch (dbError) {
      console.error("Database error in listDepartments:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    return [
      { id: "dept_cardio", name: "Cardiology", branchId: "br_01", branchName: "Central Clinic", doctorCount: 3, doctors: [] },
      { id: "dept_gen", name: "General Medicine", branchId: "br_01", branchName: "Central Clinic", doctorCount: 3, doctors: [] },
      { id: "dept_ortho", name: "Orthopedics", branchId: "br_01", branchName: "Central Clinic", doctorCount: 2, doctors: [] },
    ];
  }

  /**
   * Create department
   */
  static async createDepartment(input: DepartmentAdminInput) {
    try {
      const created = await prisma.department.create({
        data: {
          name: input.name,
          branchId: input.branchId,
          isActive: input.isActive,
        },
      });
      return { success: true, department: created };
    } catch (dbError) {
      console.error("Database error creating department:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) return { success: false, error: "Failed to create department" };
      return { success: true, department: { id: `dept_${Date.now()}`, name: input.name, branchId: input.branchId } };
    }
  }

  /**
   * List all hospital branches
   */
  static async listBranches() {
    try {
      const branches = await prisma.branch.findMany({
        where: { isActive: true },
        include: {
          departments: { select: { id: true, name: true } },
        },
      });

      if (branches.length > 0) {
        return branches.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          timezone: b.timezone,
          gracePeriodMin: b.gracePeriodMin,
          rescheduleCutoffHrs: b.rescheduleCutoffHrs,
          departmentCount: b.departments.length,
        }));
      }

      if (!ALLOW_MEMORY_FALLBACK) return [];
    } catch (dbError) {
      console.error("Database error in listBranches:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    return [
      {
        id: "br_01",
        name: "Central Hospital - Main Branch",
        address: "108 Health Boulevard, Medical District, Mumbai",
        timezone: "Asia/Kolkata",
        gracePeriodMin: 15,
        rescheduleCutoffHrs: 2,
        departmentCount: 5,
      },
      {
        id: "br_02",
        name: "MediFlow Specialty Clinic - Bandra",
        address: "42 Hill Road, Bandra West, Mumbai",
        timezone: "Asia/Kolkata",
        gracePeriodMin: 15,
        rescheduleCutoffHrs: 2,
        departmentCount: 3,
      },
    ];
  }

  /**
   * Create a new hospital branch
   */
  static async createBranch(
    input: BranchAdminInput
  ): Promise<{ success: boolean; branchId?: string; error?: string }> {
    try {
      let hospital = await prisma.hospital.findFirst();
      if (!hospital) {
        hospital = await prisma.hospital.create({
          data: { name: "MediFlow Health System" },
        });
      }

      const branch = await prisma.branch.create({
        data: {
          hospitalId: hospital.id,
          name: input.name,
          address: input.address,
          timezone: input.timezone || "Asia/Kolkata",
          gracePeriodMin: input.gracePeriodMin ?? 15,
          rescheduleCutoffHrs: input.rescheduleCutoffHrs ?? 2,
          isActive: input.isActive ?? true,
        },
      });

      return { success: true, branchId: branch.id };
    } catch (dbError) {
      console.error("Database error creating branch:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Database error creating branch" };
      }
      return { success: true, branchId: `br_${Date.now()}` };
    }
  }

  /**
   * Update branch configuration and details
   */
  static async updateBranch(
    branchId: string,
    input: UpdateBranchAdminInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.branch.update({
        where: { id: branchId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.gracePeriodMin !== undefined ? { gracePeriodMin: input.gracePeriodMin } : {}),
          ...(input.rescheduleCutoffHrs !== undefined ? { rescheduleCutoffHrs: input.rescheduleCutoffHrs } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error updating branch:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Failed to update branch" };
      }
      return { success: true };
    }
  }

  /**
   * Soft-delete / deactivate branch with conflict resolution guard for linked departments, doctors, and appointments
   */
  static async deleteBranch(
    branchId: string
  ): Promise<{
    success: boolean;
    conflict?: boolean;
    error?: string;
    details?: {
      departmentsCount: number;
      doctorsCount: number;
      activeAppointmentsCount: number;
    };
  }> {
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

    try {
      const [departments, doctors, activeAppointments] = await Promise.all([
        prisma.department.findMany({
          where: { branchId, isActive: true },
        }),
        prisma.doctor.findMany({
          where: {
            department: { branchId },
            isActive: true,
          },
        }),
        prisma.appointment.findMany({
          where: {
            branchId,
            date: { gte: today },
            status: { in: ["CONFIRMED", "WAITING", "CHECKED_IN"] },
          },
        }),
      ]);

      if (departments.length > 0 || doctors.length > 0 || activeAppointments.length > 0) {
        const issues: string[] = [];
        if (departments.length > 0) issues.push(`${departments.length} active department(s)`);
        if (doctors.length > 0) issues.push(`${doctors.length} active doctor(s)`);
        if (activeAppointments.length > 0) issues.push(`${activeAppointments.length} upcoming appointment(s)`);

        return {
          success: false,
          conflict: true,
          error: `Cannot remove branch with linked records. Please reassign or deactivate: ${issues.join(", ")}.`,
          details: {
            departmentsCount: departments.length,
            doctorsCount: doctors.length,
            activeAppointmentsCount: activeAppointments.length,
          },
        };
      }

      await prisma.branch.update({
        where: { id: branchId },
        data: { isActive: false },
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error deleting branch:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Failed to delete branch" };
      }
      return { success: true };
    }
  }

  /**
   * List all hospital appointments with multi-criteria filtering
   */
  static async listAllAppointments(params?: {
    date?: string;
    doctorId?: string;
    branchId?: string;
    status?: string;
    search?: string;
  }): Promise<AdminAppointmentDTO[]> {
    try {
      const appointments = await prisma.appointment.findMany({
        where: {
          ...(params?.date
            ? {
                date: {
                  gte: new Date(params.date + "T00:00:00.000Z"),
                  lte: new Date(params.date + "T23:59:59.999Z"),
                },
              }
            : {}),
          ...(params?.doctorId ? { doctorId: params.doctorId } : {}),
          ...(params?.branchId ? { branchId: params.branchId } : {}),
          ...(params?.status ? { status: params.status as AppointmentStatus } : {}),
          ...(params?.search
            ? {
                OR: [
                  { tokenNumber: { contains: params.search, mode: "insensitive" } },
                  { patient: { name: { contains: params.search, mode: "insensitive" } } },
                  { doctor: { name: { contains: params.search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: {
          patient: { include: { user: true } },
          doctor: true,
          branch: true,
          payment: true,
        },
        orderBy: [{ date: "desc" }, { startTime: "asc" }],
        take: 50,
      });

      if (appointments.length > 0) {
        return appointments.map((a) => ({
          id: a.id,
          tokenNumber: a.tokenNumber,
          patientName: a.patient.name,
          patientPhone: a.patient.user.phone,
          doctorName: a.doctor.name,
          doctorId: a.doctorId,
          specialty: a.doctor.specialty,
          branchName: a.branch.name,
          date: a.date.toISOString().slice(0, 10),
          startTime: a.startTime,
          status: a.status,
          feeSnapshot: Number(a.feeSnapshot || 500),
          checkedInAt: a.checkedInAt?.toISOString() || null,
          paymentStatus: a.payment?.status || null,
          refundedAt: a.payment?.refundedAt?.toISOString() || null,
        }));
      }

      if (!ALLOW_MEMORY_FALLBACK) return [];
    } catch (dbError) {
      console.error("Database error in listAllAppointments:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        throw dbError;
      }
    }

    // Dev fallback mock appointments
    return [
      {
        id: "apt_admin_01",
        tokenNumber: "A-01",
        patientName: "Rohan Verma",
        patientPhone: "+91 98111 22334",
        doctorName: "Dr. Rajesh Patel",
        doctorId: "doc_patel_01",
        specialty: "Cardiology",
        branchName: "Central Hospital - Main Branch",
        date: new Date().toISOString().slice(0, 10),
        startTime: "10:00",
        status: "COMPLETED",
        feeSnapshot: 700,
        checkedInAt: new Date().toISOString(),
      },
      {
        id: "apt_admin_02",
        tokenNumber: "A-02",
        patientName: "Anita Sharma",
        patientPhone: "+91 98765 43210",
        doctorName: "Dr. Rajesh Patel",
        doctorId: "doc_patel_01",
        specialty: "Cardiology",
        branchName: "Central Hospital - Main Branch",
        date: new Date().toISOString().slice(0, 10),
        startTime: "10:20",
        status: "IN_CONSULTATION",
        feeSnapshot: 700,
        checkedInAt: new Date().toISOString(),
      },
      {
        id: "apt_admin_03",
        tokenNumber: "A-03",
        patientName: "Vikram Malhotra",
        patientPhone: "+91 98333 44556",
        doctorName: "Dr. Rajesh Patel",
        doctorId: "doc_patel_01",
        specialty: "Cardiology",
        branchName: "Central Hospital - Main Branch",
        date: new Date().toISOString().slice(0, 10),
        startTime: "10:40",
        status: "WAITING",
        feeSnapshot: 700,
        checkedInAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Administrative override / reassignment of appointment
   */
  static async overrideAppointment(
    appointmentId: string,
    input: AppointmentOverrideInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Prisma.AppointmentUpdateInput = {};
      if (input.doctorId) updateData.doctor = { connect: { id: input.doctorId } };
      if (input.date) updateData.date = new Date(input.date + "T00:00:00.000Z");
      if (input.startTime) updateData.startTime = input.startTime;
      if (input.status) {
        updateData.status = input.status;
        if (input.status === "CHECKED_IN") {
          updateData.checkedInAt = new Date();
        } else if (input.status === "CANCELLED") {
          updateData.cancelledAt = new Date();
          updateData.cancelReason = input.cancelReason || input.overrideReason;
        }
      }

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
      });

      return { success: true };
    } catch (dbError) {
      console.error("Database error in overrideAppointment:", dbError);
      if (!ALLOW_MEMORY_FALLBACK) {
        return { success: false, error: "Failed to override appointment" };
      }
      return { success: true };
    }
  }
}
