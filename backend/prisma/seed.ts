import 'dotenv/config';
import prisma from '../src/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Seeding database (Phase 2)...');

  // Clean existing data for a fresh start (optional, but good for reliable seeding)
  await prisma.achievement.deleteMany({});
  await prisma.checkInComment.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.goalSheet.deleteMany({});
  await prisma.checkInWindow.deleteMany({});
  await prisma.goalCycle.deleteMany({});
  await prisma.thrustArea.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  // 1. Create Department
  const dept = await prisma.department.upsert({
    where: { name: 'Product Engineering' },
    update: {},
    create: { name: 'Product Engineering' },
  });

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Create Manager User
  const manager = await prisma.user.upsert({
    where: { email: 'manager@atomberg.com' },
    update: {},
    create: {
      name: 'Suresh Kumar',
      email: 'manager@atomberg.com',
      password: hashedPassword,
      role: 'MANAGER',
      department_id: dept.id,
    },
  });

  // 2b. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@atomberg.com' },
    update: {},
    create: {
      name: 'Ramesh Kumar',
      email: 'admin@atomberg.com',
      password: hashedPassword,
      role: 'ADMIN',
      department_id: dept.id,
    },
  });

  // 3. Create Employee 1 (Ayushman) - Will have an APPROVED goal sheet for testing check-ins
  const user1 = await prisma.user.upsert({
    where: { email: 'ayushman@atomberg.com' },
    update: {},
    create: {
      name: 'Ayushman Singh',
      email: 'ayushman@atomberg.com',
      password: hashedPassword,
      role: 'EMPLOYEE',
      department_id: dept.id,
      manager_id: manager.id,
    },
  });

  // 4. Create Employee 2 (Shreya Kumari) - Will have a SUBMITTED goal sheet for testing manager approval
  const user2 = await prisma.user.upsert({
    where: { email: 'shreya@atomberg.com' },
    update: {},
    create: {
      name: 'Shreya Kumari',
      email: 'shreya@atomberg.com',
      password: hashedPassword,
      role: 'EMPLOYEE',
      department_id: dept.id,
      manager_id: manager.id,
    },
  });

  // 5. Create Goal Cycle
  const cycle = await prisma.goalCycle.create({
    data: {
      name: 'FY2025-26',
      start_date: new Date('2025-04-01'),
      end_date: new Date('2026-03-31'),
      is_active: true,
    },
  });

  // 6. Create Check-in Windows (Phase 2)
  const now = new Date();
  await prisma.checkInWindow.createMany({
    data: [
      {
        cycle_id: cycle.id,
        period: 'Q1',
        opens_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7), // Opened 7 days ago
        closes_at: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7), // Closes in 7 days
        is_active: true, // Q1 is ACTIVE for testing
      },
      {
        cycle_id: cycle.id,
        period: 'Q2',
        opens_at: new Date('2025-10-01'),
        closes_at: new Date('2025-10-15'),
        is_active: false,
      },
      {
        cycle_id: cycle.id,
        period: 'Q3',
        opens_at: new Date('2026-01-01'),
        closes_at: new Date('2026-01-15'),
        is_active: false,
      },
      {
        cycle_id: cycle.id,
        period: 'Q4_ANNUAL',
        opens_at: new Date('2026-03-15'),
        closes_at: new Date('2026-03-31'),
        is_active: false,
      }
    ]
  });

  // 7. Create Thrust Areas
  const thrustAreas = [
    { name: 'Innovation & R&D', description: 'Drive product innovation and research initiatives' },
    { name: 'Revenue Growth', description: 'Achieve revenue targets and expand market share' },
    { name: 'Operational Efficiency', description: 'Optimize processes and reduce operational costs' },
  ];

  const createdAreas = [];
  for (const area of thrustAreas) {
    const ta = await prisma.thrustArea.create({
      data: {
        name: area.name,
        description: area.description,
        created_by: manager.id,
      },
    });
    createdAreas.push(ta);
  }

  // 8. Create APPROVED goal sheet for Ayushman (for testing Check-in UI)
  const approvedSheet = await prisma.goalSheet.create({
    data: {
      employee_id: user1.id,
      cycle_id: cycle.id,
      status: 'APPROVED',
      submitted_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
      approved_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 28), // 28 days ago
      approved_by: manager.id,
      goals: {
        create: [
          {
            thrust_area_id: createdAreas[1].id, // Revenue Growth
            title: 'Increase Q1 Sales Revenue',
            uom_type: 'NUMERIC',
            uom_direction: 'MIN', // higher is better
            target_value: '5000000',
            weightage: 40,
            is_readonly_title: true,
            is_readonly_target: true,
          },
          {
            thrust_area_id: createdAreas[2].id, // Operational Efficiency
            title: 'Reduce Customer Complaint TAT',
            uom_type: 'NUMERIC',
            uom_direction: 'MAX', // lower is better
            target_value: '24', // 24 hours
            weightage: 30,
            is_readonly_title: true,
            is_readonly_target: true,
          },
          {
            thrust_area_id: createdAreas[0].id, // Innovation
            title: 'Launch Smart Ceiling Fan Prototype',
            uom_type: 'TIMELINE',
            target_value: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days from now
            weightage: 30,
            is_readonly_title: true,
            is_readonly_target: true,
          }
        ]
      }
    }
  });

  // 9. Create SUBMITTED goal sheet for Shreya Kumari (for testing Manager Approval Dashboard)
  await prisma.goalSheet.create({
    data: {
      employee_id: user2.id,
      cycle_id: cycle.id,
      status: 'SUBMITTED',
      submitted_at: new Date(),
      goals: {
        create: [
          {
            thrust_area_id: createdAreas[0].id,
            title: 'File 2 New Patents',
            uom_type: 'NUMERIC',
            uom_direction: 'MIN',
            target_value: '2',
            weightage: 100,
          }
        ]
      }
    }
  });

  // 10. Seed Escalation Rules
  await prisma.escalationLog.deleteMany({});
  await prisma.escalationRule.deleteMany({});

  await prisma.escalationRule.createMany({
    data: [
      {
        name:           "Remind employees to submit goals",
        trigger_type:   "goal_not_submitted",
        days_threshold: 3,
        notify_level:   "employee",
        created_by:     admin.id,
      },
      {
        name:           "Alert manager if goals not approved",
        trigger_type:   "goal_not_approved",
        days_threshold: 5,
        notify_level:   "manager",
        created_by:     admin.id,
      },
      {
        name:           "Warn employees before check-in closes",
        trigger_type:   "checkin_missed",
        days_threshold: 3,
        notify_level:   "employee",
        created_by:     admin.id,
      },
    ],
  });
  console.log("✅ Escalation rules seeded");

  console.log('✅ Phase 2 Seed complete!');
  console.log(`   Manager: ${manager.email} / password123`);
  console.log(`   Employee (Approved): ${user1.email} / password123`);
  console.log(`   Employee (Pending): ${user2.email} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
