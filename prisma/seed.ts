import 'dotenv/config'
import { PrismaClient, Role, Currency } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to .env before seeding.')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@badcute.local').toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin1234'

  const passwordHash = await bcrypt.hash(password, 10)
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Admin', passwordHash, role: Role.ADMIN },
  })
  console.log(`Admin: ${admin.email} / ${password}`)

  const existingU = await prisma.currencyRate.findFirst({
    where: { code: Currency.U },
    orderBy: { effectiveAt: 'desc' },
  })
  if (!existingU) {
    await prisma.currencyRate.create({
      data: { code: Currency.U, rateToW: 1, notes: 'Placeholder : please update on Currency Rates page' },
    })
  }
  const existingY = await prisma.currencyRate.findFirst({
    where: { code: Currency.Y },
    orderBy: { effectiveAt: 'desc' },
  })
  if (!existingY) {
    await prisma.currencyRate.create({
      data: { code: Currency.Y, rateToW: 1, notes: 'Placeholder : please update on Currency Rates page' },
    })
  }
  const existingW = await prisma.currencyRate.findFirst({
    where: { code: Currency.W },
    orderBy: { effectiveAt: 'desc' },
  })
  if (!existingW) {
    await prisma.currencyRate.create({
      data: { code: Currency.W, rateToW: 1, notes: 'Main currency' },
    })
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
