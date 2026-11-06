const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.update({
    where: { username: 'owner' },
    data: { passwordHash: bcrypt.hashSync('admin123', 10) },
  });
  try {
    await prisma.user.update({
      where: { username: 'operator' },
      data: { passwordHash: bcrypt.hashSync('operator123', 10) },
    });
  } catch (e) {
    console.log('operator update skipped:', e.message);
  }
  console.log('Passwords normalized: owner/admin123, operator/operator123');
  await prisma.$disconnect();
}

main();
