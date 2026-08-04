import { PrismaClient, RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES: { name: RoleName; label: string; description: string }[] = [
  { name: RoleName.CUSTOMER, label: 'Customer', description: 'End customer who submits and tracks support tickets.' },
  { name: RoleName.AGENT, label: 'Support Agent', description: 'Handles tickets assigned to them.' },
  { name: RoleName.SENIOR_AGENT, label: 'Senior Agent', description: 'Experienced agent with escalation privileges.' },
  { name: RoleName.MANAGER, label: 'Manager', description: 'Oversees a team of agents and organization-wide metrics.' },
  { name: RoleName.ADMIN, label: 'Admin', description: 'Full control over the organization, its members, and settings.' },
];

const PERMISSIONS: { key: string; description: string; roles: RoleName[] }[] = [
  {
    key: 'user:invite',
    description: 'Invite new staff members or customers into the organization',
    roles: [RoleName.ADMIN, RoleName.MANAGER],
  },
  {
    key: 'user:manage',
    description: "Change a member's role or suspend/reactivate their account",
    roles: [RoleName.ADMIN, RoleName.MANAGER],
  },
];

const DEMO_PASSWORD = 'Password123!';

async function main() {
  console.log('Seeding roles...');
  const roleRecords: Record<RoleName, { id: string }> = {} as never;
  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: { label: role.label, description: role.description },
      create: role,
    });
    roleRecords[role.name] = record;
  }

  console.log('Seeding permissions...');
  for (const permission of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: { key: permission.key, description: permission.description },
    });
    for (const roleName of permission.roles) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleRecords[roleName].id, permissionId: record.id } },
        update: {},
        create: { roleId: roleRecords[roleName].id, permissionId: record.id },
      });
    }
  }

  console.log('Seeding demo organization...');
  const organization = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme',
      primaryColor: '#6366F1',
      timezone: 'America/New_York',
    },
  });

  console.log('Seeding demo users (all use password: ' + DEMO_PASSWORD + ')...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const demoUsers: { email: string; firstName: string; lastName: string; role: RoleName }[] = [
    { email: 'admin@acme.com', firstName: 'Ada', lastName: 'Admin', role: RoleName.ADMIN },
    { email: 'manager@acme.com', firstName: 'Mia', lastName: 'Manager', role: RoleName.MANAGER },
    { email: 'senior@acme.com', firstName: 'Sam', lastName: 'Senior', role: RoleName.SENIOR_AGENT },
    { email: 'agent@acme.com', firstName: 'Alex', lastName: 'Agent', role: RoleName.AGENT },
    { email: 'customer@acme.com', firstName: 'Cory', lastName: 'Customer', role: RoleName.CUSTOMER },
  ];

  for (const demoUser of demoUsers) {
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {},
      create: {
        organizationId: organization.id,
        email: demoUser.email,
        passwordHash,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        roleId: roleRecords[demoUser.role].id,
        status: UserStatus.ACTIVE,
      },
    });
  }

  console.log('\nDone. Demo login credentials (organization: Acme Corp / acme):');
  for (const demoUser of demoUsers) {
    console.log(`  ${demoUser.role.padEnd(13)} ${demoUser.email}  /  ${DEMO_PASSWORD}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
