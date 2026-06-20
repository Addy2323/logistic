import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create admin user (phone is now the unique identifier)
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { phone: '255756312736' },
        update: {},
        create: {
            email: 'admin@mhema.co.tz',
            password: adminPassword,
            fullName: 'Admin User',
            phone: '255756312736',
            role: 'ADMIN'
        }
    });
    console.log('✅ Created admin user:', admin.phone);

    // Create agents
    const agentPassword = await bcrypt.hash('agent123', 10);

    const agents = [
        {
            email: 'agent1@mhema.co.tz',
            fullName: 'Salim Juma',
            phone: '255765432101',
            commissionRate: 10,
            maxOrderCapacity: 10
        },
        {
            email: 'agent2@mhema.co.tz',
            fullName: 'Maria Mwangi',
            phone: '255712345601',
            commissionRate: 12,
            maxOrderCapacity: 15
        },
        {
            email: 'agent3@mhema.co.tz',
            fullName: 'Hassan Ali',
            phone: '255723456701',
            commissionRate: 10,
            maxOrderCapacity: 12
        }
    ];

    for (const agentData of agents) {
        const user = await prisma.user.upsert({
            where: { phone: agentData.phone },
            update: {},
            create: {
                email: agentData.email,
                password: agentPassword,
                fullName: agentData.fullName,
                phone: agentData.phone,
                role: 'AGENT',
                agent: {
                    create: {
                        commissionRate: agentData.commissionRate,
                        maxOrderCapacity: agentData.maxOrderCapacity,
                        availabilityStatus: 'ONLINE'
                    }
                }
            },
            include: { agent: true }
        });
        console.log(`✅ Created agent: ${user.fullName} (${user.phone})`);

        if (user.agent) {
            // Create active monthly subscription for the agent
            await prisma.agentSubscription.create({
                data: {
                    agentId: user.agent.id,
                    plan: 'MONTHLY',
                    amount: 30000,
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            });
            console.log(`   └─ Created active monthly subscription for: ${user.fullName}`);
        }
    }

    // Create customers
    const customerPassword = await bcrypt.hash('customer123', 10);

    const customers = [
        {
            email: 'customer1@example.com',
            fullName: 'John Doe',
            phone: '255712345678'
        },
        {
            email: 'customer2@example.com',
            fullName: 'Jane Smith',
            phone: '255723456789'
        }
    ];

    for (const customerData of customers) {
        const user = await prisma.user.upsert({
            where: { phone: customerData.phone },
            update: {},
            create: {
                email: customerData.email,
                password: customerPassword,
                fullName: customerData.fullName,
                phone: customerData.phone,
                role: 'CUSTOMER'
            }
        });
        console.log(`✅ Created customer: ${user.fullName} (${user.phone})`);
    }

    // Create transport methods
    const transportMethods = [
        {
            name: 'Bolt',
            description: 'Quick urban deliveries via ride-hailing',
            basePrice: 5000,
            pricePerKm: 500,
            pricePerKg: null,
            icon: 'bolt'
        },
        {
            name: 'Bus',
            description: 'Inter-city shipments via public transport',
            basePrice: 10000,
            pricePerKm: 300,
            pricePerKg: 200,
            icon: 'bus'
        },
        {
            name: 'Cargo',
            description: 'Large or heavy items freight service',
            basePrice: 20000,
            pricePerKm: 800,
            pricePerKg: 500,
            icon: 'truck'
        },
        {
            name: 'Motorcycle',
            description: 'Fast delivery for small packages',
            basePrice: 3000,
            pricePerKm: 400,
            pricePerKg: null,
            icon: 'bike'
        }
    ];

    for (const method of transportMethods) {
        const transport = await prisma.transportMethod.upsert({
            where: { id: method.name.toLowerCase() },
            update: {},
            create: method
        });
        console.log(`✅ Created transport method: ${transport.name}`);
    }

    // Create sample payment QR code
    const qrCode = await prisma.paymentQRCode.upsert({
        where: { id: 'sample-mpesa-qr' },
        update: {},
        create: {
            id: 'sample-mpesa-qr',
            provider: 'M_PESA',
            accountName: 'MHEMA Express Ltd',
            lipaNumber: '400200',
            qrCodeUrl: '/uploads/sample-qr.png',
            uploadedBy: admin.id
        }
    });
    console.log('✅ Created sample payment QR code');

    // Create notification templates (V2.0)
    const templates = [
        {
            key: 'driver_assignment_sms',
            type: 'SMS',
            content: 'Hello {driverName}, you have been assigned to order {orderNumber}. Customer Phone: {customerPhone}, Pickup: {pickupLocation}, Delivery: {deliveryLocation}. Please contact agent at {agentPhone}.'
        },
        {
            key: 'driver_assignment_whatsapp',
            type: 'WHATSAPP',
            content: 'Hello *{driverName}*,\n\nYou have been assigned order *{orderNumber}*.\n\n*Customer Name*: {customerName}\n*Customer Phone*: {customerPhone}\n*Pickup Address*: {pickupLocation}\n*Delivery Address*: {deliveryLocation}\n*GPS Coordinates*: {latitude},{longitude}\n*Google Maps*: https://www.google.com/maps/search/?api=1&query={latitude},{longitude}\n\n*Instructions*: {notes}\n\nThank you for choosing LotusRise!'
        }
    ];

    for (const t of templates) {
        await prisma.notificationTemplate.upsert({
            where: { key: t.key },
            update: { content: t.content },
            create: t
        });
        console.log(`✅ Seeded template: ${t.key}`);
    }

    // Create default subscription packages (Dynamic Packages V2.0)
    const subscriptionPackages = [
        {
            key: 'WEEKLY',
            name: 'Weekly Plan',
            price: 10000,
            benefits: [
                'Receive auto-assigned orders (weekly duration)',
                'Standard public profile listing',
                'Basic WhatsApp inquiries connect',
                'Direct payment verification'
            ]
        },
        {
            key: 'MONTHLY',
            name: 'Monthly Plan',
            price: 30000,
            benefits: [
                'Priority auto-assigned orders',
                'Premium public profile listing',
                'Advanced WhatsApp inquiries connect',
                'Direct payment verification',
                'Product catalog clicks analytics'
            ]
        },
        {
            key: 'SEMI_ANNUAL',
            name: 'Semi Annual Plan',
            price: 150000,
            benefits: [
                'High-priority auto-assigned orders',
                'Exclusive public boutique profile',
                'Blue-tick verification priority support',
                'Product catalog clicks & views analytics',
                'Dedicated driver assignment options'
            ]
        },
        {
            key: 'ANNUAL',
            name: 'Annual Plan',
            price: 280000,
            benefits: [
                'Top-priority auto-assigned orders',
                'Ultimate public boutique showcase',
                'Blue-tick merit verification fee exemption',
                'Advanced boutique performance reports',
                '24/7 dedicated support priority'
            ]
        }
    ];

    for (const pkg of subscriptionPackages) {
        await prisma.subscriptionPackage.upsert({
            where: { key: pkg.key },
            update: {
                name: pkg.name,
                price: pkg.price,
                benefits: pkg.benefits
            },
            create: pkg
        });
        console.log(`✅ Seeded subscription package: ${pkg.key}`);
    }

    console.log('\n🎉 Database seed completed successfully!');
    console.log('\nTest Accounts (OTP-only, no passwords needed):');
    console.log('==============================================');
    console.log('Admin:    +255756312736');
    console.log('Agent 1:  +255765432101');
    console.log('Agent 2:  +255712345601');
    console.log('Customer: +255712345678');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
