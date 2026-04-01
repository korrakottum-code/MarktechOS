import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const staff = await prisma.staff.findMany();
    console.log("=== STAFF RECORDS IN DB ===");
    staff.forEach(s => {
      console.log(`- ID: ${s.id}, Name: ${s.name}, Role: ${s.role}, Email: ${s.email || 'N/A'}, Phone: ${s.phone || 'N/A'}`);
    });
    console.log("===========================");
  } catch (err) {
    console.error("Failed to query staff:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
