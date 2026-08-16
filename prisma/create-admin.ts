import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  // Check npm_config environment variables (when arguments are passed directly via npm run)
  if (process.env.npm_config_email) result.email = process.env.npm_config_email;
  if (process.env.npm_config_name) result.name = process.env.npm_config_name;
  if (process.env.npm_config_phone) result.phone = process.env.npm_config_phone;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx).trim();
        const value = arg.slice(eqIdx + 1).trim();
        result[key] = value;
      } else {
        const key = arg.slice(2).trim();
        if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
          result[key] = args[i + 1].trim();
          i++;
        } else {
          result[key] = "true";
        }
      }
    }
  }
  return result;
}

function generateSecurePassword(length: number = 20): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = upper + lower + numbers + symbols;

  const bytes = crypto.randomBytes(length);
  // Ensure at least one from each character set
  const passwordChars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  for (let i = 4; i < length; i++) {
    passwordChars.push(allChars[bytes[i] % allChars.length]);
  }

  // Fisher-Yates shuffle
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Determine if explicit CLI arguments were provided or if falling back to env vars
  const isExplicitCli = Boolean(args.email || args.name);
  const email = args.email || process.env.DEFAULT_ADMIN_EMAIL;
  const name = args.name || process.env.DEFAULT_ADMIN_NAME;
  const phone = args.phone || process.env.DEFAULT_ADMIN_PHONE;

  if (!email || !name) {
    console.error("\nUsage: npm run create-admin [-- --email=<email> --name=<name> [--phone=<phone>]]");
    console.error("Or define DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, and DEFAULT_ADMIN_NAME in your .env file.\n");
    console.error("Example: npm run create-admin -- --email=admin@hospital.com --name=\"System Administrator\"\n");
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone ? phone.trim() : null;
  const normalizedName = name.trim();

  // Determine password: use DEFAULT_ADMIN_PASSWORD if set, otherwise generate random password
  const envPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const isEnvPassword = Boolean(envPassword && envPassword.trim().length > 0);
  const rawPassword = isEnvPassword ? envPassword!.trim() : generateSecurePassword(20);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    },
    include: {
      admin: true,
    },
  });

  if (existingUser) {
    // If running via the env-var default path, make it safely idempotent
    if (!isExplicitCli) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            failedLogins: 0,
            lockedUntil: null,
            isActive: true,
            isVerified: true,
            role: "ADMIN",
          },
        });

        await tx.admin.upsert({
          where: { userId: existingUser.id },
          update: { name: normalizedName },
          create: { userId: existingUser.id, name: normalizedName },
        });
      });

      console.log("\n=======================================================");
      console.log(" Admin Account Synchronized Successfully (Idempotent)");
      console.log("=======================================================");
      console.log(`User ID:  ${existingUser.id}`);
      console.log(`Name:     ${normalizedName}`);
      console.log(`Email:    ${existingUser.email}`);
      console.log(`Role:     ADMIN`);
      console.log("-------------------------------------------------------");
      console.log("Password synchronized with DEFAULT_ADMIN_PASSWORD.");
      console.log("=======================================================\n");
      return;
    }

    // Explicit CLI-args path: fail cleanly on duplicate collision
    if (existingUser.email?.toLowerCase() === normalizedEmail) {
      console.error(`\nError: A user account with email "${normalizedEmail}" already exists. Aborting.\n`);
    } else {
      console.error(`\nError: A user account with phone "${normalizedPhone}" already exists. Aborting.\n`);
    }
    process.exit(1);
  }

  // Create new User and Admin profile
  const adminUser = await prisma.user.create({
    data: {
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: "ADMIN",
      isVerified: true,
      isActive: true,
      admin: {
        create: {
          name: normalizedName,
        },
      },
    },
    include: {
      admin: true,
    },
  });

  console.log("\n=======================================================");
  console.log(" Admin Account Created Successfully");
  console.log("=======================================================");
  console.log(`User ID:  ${adminUser.id}`);
  console.log(`Admin ID: ${adminUser.admin?.id}`);
  console.log(`Name:     ${adminUser.admin?.name}`);
  console.log(`Email:    ${adminUser.email}`);
  if (adminUser.phone) {
    console.log(`Phone:    ${adminUser.phone}`);
  }
  console.log(`Role:     ${adminUser.role}`);
  console.log("-------------------------------------------------------");
  if (isEnvPassword) {
    console.log("Password configured via DEFAULT_ADMIN_PASSWORD.");
  } else {
    console.log("Generated Password:");
    console.log(`\n  ${rawPassword}\n`);
    console.log("-------------------------------------------------------");
    console.log("⚠️  SAVE THIS PASSWORD — it will not be shown again.");
  }
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("Error creating admin account:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
