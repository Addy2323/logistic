import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@mhema.co.tz' },
        update: {},
        create: {
            email: 'admin@mhema.co.tz',
            password: adminPassword,
            fullName: 'Admin User',
            phone: '0756312736',
            role: 'ADMIN'
        }
    });
    console.log('✅ Created admin user:', admin.email);

    // Create agents
    const agentPassword = await bcrypt.hash('agent123', 10);

    const agents = [
        {
            email: 'agent1@mhema.co.tz',
            fullName: 'Salim Juma',
            phone: '0765432101',
            commissionRate: 10,
            maxOrderCapacity: 10
        },
        {
            email: 'agent2@mhema.co.tz',
            fullName: 'Maria Mwangi',
            phone: '0712345601',
            commissionRate: 12,
            maxOrderCapacity: 15
        },
        {
            email: 'agent3@mhema.co.tz',
            fullName: 'Hassan Ali',
            phone: '0723456701',
            commissionRate: 10,
            maxOrderCapacity: 12
        }
    ];

    for (const agentData of agents) {
        const user = await prisma.user.upsert({
            where: { email: agentData.email },
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
        console.log(`✅ Created agent: ${user.email}`);
    }

    // Create customers
    const customerPassword = await bcrypt.hash('customer123', 10);

    const customers = [
        {
            email: 'customer1@example.com',
            fullName: 'John Doe',
            phone: '0712345678'
        },
        {
            email: 'customer2@example.com',
            fullName: 'Jane Smith',
            phone: '0723456789'
        }
    ];

    for (const customerData of customers) {
        const user = await prisma.user.upsert({
            where: { email: customerData.email },
            update: {},
            create: {
                email: customerData.email,
                password: customerPassword,
                fullName: customerData.fullName,
                phone: customerData.phone,
                role: 'CUSTOMER'
            }
        });
        console.log(`✅ Created customer: ${user.email}`);
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

    console.log('\n🎉 Database seed completed successfully!');
    console.log('\nTest Credentials:');
    console.log('================');
    console.log('Admin: admin@mhema.co.tz / admin123');
    console.log('Agent: agent1@mhema.co.tz / agent123');
    console.log('Customer: customer1@example.com / customer123');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
