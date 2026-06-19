const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedPlans() {
  await prisma.plan.createMany({
    data: [
      {
        name: 'Free',
        price: 0,
        billing_cycle: 'MONTHLY',
        max_users: 1,
        max_products: 50,
        max_invoices: 100,
        features: [
          'Inventory',
          'Billing',
          'Basic Reports'
        ]
      },

      {
        name: 'Pro',
        price: 499,
        billing_cycle: 'MONTHLY',
        max_users: 5,
        max_products: 1000,
        max_invoices: 10000,
        features: [
          'Inventory',
          'Billing',
          'GST Reports',
          'Customer Portal',
          'Purchase Orders'
        ]
      },

      {
        name: 'Enterprise',
        price: 1999,
        billing_cycle: 'MONTHLY',
        max_users: 999,
        max_products: 999999,
        max_invoices: 999999,
        features: [
          'Everything in Pro',
          'Multi Branch',
          'Priority Support',
          'Custom Features'
        ]
      }
    ],
    skipDuplicates: true
  });

  console.log('Plans Seeded Successfully');
}

seedPlans()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });