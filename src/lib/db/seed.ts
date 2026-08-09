import bcrypt from "bcryptjs";
import { prisma } from "./index";

export async function seedDatabase() {
  console.log("Seeding MediFlow database...");

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash("Password@123", salt);

  // 1. Create Hospital & Branch
  const hospital = await prisma.hospital.upsert({
    where: { id: "hosp_apollo" },
    update: {},
    create: {
      id: "hosp_apollo",
      name: "Apollo Multispecialty Hospital",
      branches: {
        create: [
          {
            id: "branch_main",
            name: "Main Campus (Central)",
            address: "42 Healthcare Avenue, Medical City",
            timezone: "Asia/Kolkata",
            gracePeriodMin: 15,
            earlyCheckinMin: 60,
            maxAdvanceBookDays: 30,
            rescheduleCutoffHrs: 2,
            departments: {
              create: [
                { id: "dept_cardio", name: "Cardiology" },
                { id: "dept_neuro", name: "Neurology" },
                { id: "dept_ortho", name: "Orthopedics" },
                { id: "dept_pedia", name: "Pediatrics" },
                { id: "dept_general", name: "General Medicine" },
              ],
            },
          },
        ],
      },
    },
    include: {
      branches: {
        include: { departments: true },
      },
    },
  });

  // 2. Create Admin User
  await prisma.user.upsert({
    where: { email: "admin@mediflow.com" },
    update: {},
    create: {
      email: "admin@mediflow.com",
      phone: "+919000000001",
      passwordHash: defaultPasswordHash,
      role: "ADMIN",
      admin: {
        create: {
          name: "Priya Sharma (Admin Lead)",
        },
      },
    },
  });

  // 3. Create Doctors
  await prisma.user.upsert({
    where: { email: "dr.patel@mediflow.com" },
    update: {},
    create: {
      email: "dr.patel@mediflow.com",
      phone: "+919000000002",
      passwordHash: defaultPasswordHash,
      role: "DOCTOR",
      doctor: {
        create: {
          id: "doc_patel",
          name: "Dr. Rajesh Patel",
          specialty: "Cardiology",
          bio: "Senior Interventional Cardiologist with 15+ years of experience in complex coronary interventions.",
          qualifications: "MBBS, MD, DM (Cardiology), FACC",
          experience: 15,
          fee: 1000,
          language: ["English", "Hindi", "Gujarati"],
          appointmentDurationMin: 20,
          bufferMinutes: 5,
          departmentId: "dept_cardio",
          availability: {
            create: [
              { dayOfWeek: 1, startTime: "09:00", endTime: "13:00", breakStart: "11:00", breakEnd: "11:30" },
              { dayOfWeek: 2, startTime: "09:00", endTime: "13:00", breakStart: "11:00", breakEnd: "11:30" },
              { dayOfWeek: 3, startTime: "09:00", endTime: "13:00", breakStart: "11:00", breakEnd: "11:30" },
              { dayOfWeek: 4, startTime: "09:00", endTime: "13:00", breakStart: "11:00", breakEnd: "11:30" },
              { dayOfWeek: 5, startTime: "09:00", endTime: "13:00", breakStart: "11:00", breakEnd: "11:30" },
            ],
          },
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "dr.ananya@mediflow.com" },
    update: {},
    create: {
      email: "dr.ananya@mediflow.com",
      phone: "+919000000003",
      passwordHash: defaultPasswordHash,
      role: "DOCTOR",
      doctor: {
        create: {
          id: "doc_ananya",
          name: "Dr. Ananya Roy",
          specialty: "Neurology",
          bio: "Consultant Neurologist specializing in stroke management, epilepsy, and neuro-rehabilitation.",
          qualifications: "MBBS, MD (Medicine), DM (Neurology)",
          experience: 10,
          fee: 1200,
          language: ["English", "Hindi", "Bengali"],
          appointmentDurationMin: 25,
          bufferMinutes: 5,
          departmentId: "dept_neuro",
          availability: {
            create: [
              { dayOfWeek: 1, startTime: "10:00", endTime: "14:00", breakStart: "12:00", breakEnd: "12:30" },
              { dayOfWeek: 3, startTime: "10:00", endTime: "14:00", breakStart: "12:00", breakEnd: "12:30" },
              { dayOfWeek: 5, startTime: "10:00", endTime: "14:00", breakStart: "12:00", breakEnd: "12:30" },
            ],
          },
        },
      },
    },
  });

  // 4. Create Demo Patient
  await prisma.user.upsert({
    where: { email: "patient@mediflow.com" },
    update: {},
    create: {
      email: "patient@mediflow.com",
      phone: "+919876543210",
      passwordHash: defaultPasswordHash,
      role: "PATIENT",
      patient: {
        create: {
          name: "Meet Vora",
          age: 34,
          gender: "MALE",
          bloodGroup: "O+",
        },
      },
    },
  });

  console.log("Database seeded successfully!");
  return { hospital, message: "Seed completed successfully" };
}
