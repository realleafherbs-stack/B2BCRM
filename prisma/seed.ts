import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: { email: 'admin@crm.com', password, role: 'ADMIN' },
  })
  console.log('Seeded admin user: admin@crm.com')
}

main().finally(() => prisma.$disconnect())
