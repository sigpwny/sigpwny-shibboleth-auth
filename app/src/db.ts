import { PrismaClient } from '@prisma/client'

// init db connection via prisma
const prisma = new PrismaClient()

export default prisma;