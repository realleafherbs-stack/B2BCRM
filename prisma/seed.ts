import { config } from 'dotenv'
config({ path: '.env' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = [
    { email: 'anton.d3v@gmail.com',     password: 'anton725' },
    { email: 'realleafherbs@gmail.com', password: 'doron123' },
  ]
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 12)
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashed },
      create: { email: u.email, password: hashed, role: 'ADMIN' },
    })
    console.log(`Seeded admin: ${u.email}`)
  }
}

main().finally(() => prisma.$disconnect())
