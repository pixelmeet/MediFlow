import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = "MediFlow123!";

async function main() {
  console.log("Seeding MediFlow test data...");

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const hospital = await prisma.hospital.upsert({
    where: { id: "seed-hospital-1" },
    update: {},
    create: {
      id: "seed-hospital-1",
      name: "MediFlow Demo Hospital",
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: "seed-branch-1" },
    update: {},
    create: {
      id: "seed-branch-1",
      hospitalId: hospital.id,
      name: "Main Branch",
      address: "123 Healthcare Avenue, Mumbai",
      timezone: "Asia/Kolkata",
    },
  });

  const department = await prisma.department.upsert({
    where: { id: "seed-dept-1" },
    update: {},
    create: {
      id: "seed-dept-1",
      branchId: branch.id,
      name: "Cardiology",
    },
  });

  // Patient
  const patientUser = await prisma.user.upsert({
    where: { email: "patient@mediflow.test" },
    update: { passwordHash, isVerified: true, isActive: true },
    create: {
      email: "patient@mediflow.test",
      phone: "+919876543210",
      passwordHash,
      role: "PATIENT",
      isVerified: true,
      patient: {
        create: {
          name: "Meet Patient",
          age: 34,
          gender: "male",
        },
      },
    },
    include: { patient: true },
  });

  // Doctor
  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@mediflow.test" },
    update: { passwordHash, isVerified: true, isActive: true },
    create: {
      email: "doctor@mediflow.test",
      phone: "+919876543211",
      passwordHash,
      role: "DOCTOR",
      isVerified: true,
      doctor: {
        create: {
          name: "Patel",
          specialty: "Cardiologist",
          departmentId: department.id,
          fee: 800,
          language: ["English", "Hindi"],
          bio: "Senior cardiologist with 15 years of experience.",
          experience: 15,
        },
      },
    },
    include: { doctor: true },
  });

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mediflow.test" },
    update: { passwordHash, isVerified: true, isActive: true },
    create: {
      email: "admin@mediflow.test",
      phone: "+919876543212",
      passwordHash,
      role: "ADMIN",
      isVerified: true,
      admin: {
        create: {
          name: "Priya Admin",
        },
      },
    },
    include: { admin: true },
  });

  console.log("\nSeed complete. Test credentials:\n");
  console.log("Patient: patient@mediflow.test /", TEST_PASSWORD);
  console.log("Doctor:  doctor@mediflow.test /", TEST_PASSWORD);
  console.log("Admin:   admin@mediflow.test /", TEST_PASSWORD);
  console.log("\nUser IDs:");
  console.log("  Patient:", patientUser.id);
  console.log("  Doctor:", doctorUser.id);
  console.log("  Admin:", adminUser.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
