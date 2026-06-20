import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding 8 verified agents, reviews, and product catalogs...');

    const passwordHash = await bcrypt.hash('agent123', 10);
    
    // Find or create customer for reviews
    let customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (!customer) {
        customer = await prisma.user.create({
            data: {
                fullName: 'John Doe',
                phone: '255712345678',
                email: 'customer1@example.com',
                password: await bcrypt.hash('customer123', 10),
                role: 'CUSTOMER'
            }
        });
    }

    // List of exactly 8 agent profiles
    const agentProfiles = [
        { phone: '255765432101', name: 'Salim Juma', business: 'Salim Sourcing & Tech Shop', region: 'Dar es Salaam', district: 'Ilala', level: 'GOLD', bio: 'Specialist in importing high-quality electronics, smartphones, accessories, and home appliances directly from Shenzhen and Yiwu suppliers.', rate: 10, rating: 4.8, count: 145 },
        { phone: '255712345601', name: 'Maria Mwangi', business: 'Maria Luxury Fashion & Fabrics', region: 'Dar es Salaam', district: 'Kariakoo', level: 'PLATINUM', bio: 'Expert shopping agent for women\'s luxury wear, custom bridal fabrics, cosmetics, bags, and designer footwear. Sourcing from the finest Kariakoo wholesalers.', rate: 12, rating: 4.9, count: 312 },
        { phone: '255723456701', name: 'Hassan Ali', business: 'Hassan Tools & Hardware Hub', region: 'Dar es Salaam', district: 'Kigamboni', level: 'SILVER', bio: 'Wholesale sourcing agent specializing in industrial machinery, power tools, electrical wiring, sanitaryware, and building materials.', rate: 10, rating: 4.6, count: 78 },
        { phone: '255734567801', name: 'Neema Kamau', business: 'Arusha Alpine Sourcing', region: 'Arusha', district: 'Arusha CBD', level: 'GOLD', bio: 'Specialized in fresh produce cargo, agricultural equipment, and safari gear sourcing across East Africa.', rate: 9, rating: 4.75, count: 124 },
        { phone: '255745678901', name: 'Juma Mossi', business: 'Mwanza Lake Sourcing', region: 'Mwanza', district: 'Nyamagana', level: 'SILVER', bio: 'Your partner in fish exports, boat equipment sourcing, and wholesale packaging materials in Mwanza.', rate: 10, rating: 4.5, count: 62 },
        { phone: '255756789001', name: 'Asha Bakari', business: 'Zanzibar Spice Sourcing', region: 'Zanzibar', district: 'Zanzibar Town', level: 'GOLD', bio: 'Local expert in spices, coconut oil derivatives, traditional garments (Kangas), and handcrafts sourcing.', rate: 11, rating: 4.8, count: 115 },
        { phone: '255767890101', name: 'David Njoroge', business: 'Capital Sourcing Co.', region: 'Dodoma', district: 'Dodoma Urban', level: 'NONE', bio: 'General purchasing agent focusing on public sector commodities and government contract supply items.', rate: 8, rating: 4.2, count: 38 },
        { phone: '255778901201', name: 'Amina Said', business: 'Tanga Port Logistics & Sourcing', region: 'Tanga', district: 'Tanga Port', level: 'GOLD', bio: 'Import-export agent handling clearance, agricultural products cargo, and machinery sourcing.', rate: 10, rating: 4.7, count: 98 }
    ];

    console.log('Cleaning existing agent and user records to restore pristine state...');
    
    // Find all users from the 30-agent seeding script to delete them
    const allKnownPhones = [
        ...agentProfiles.map(ap => ap.phone),
        '255789012301', '255790123401', '255711223344', '255722334455', '255733445566', 
        '255744556677', '255755667788', '255766778899', '255777889900', '255788990011', 
        '255799001122', '255711122233', '255722233344', '255733344455', '255744455566', 
        '255755566677', '255766677788', '255777788899', '255788899900', '255799900011', 
        '255711335577', '255722446688'
    ];

    const usersToDelete = await prisma.user.findMany({
        where: { phone: { in: allKnownPhones } },
        include: { agent: true }
    });

    const agentIds = usersToDelete.filter(u => u.agent).map(u => u.agent.id);

    await prisma.customerReview.deleteMany({ where: { agentId: { in: agentIds } } });
    await prisma.order.deleteMany({ where: { agentId: { in: agentIds } } });
    await prisma.product.deleteMany({ where: { agentId: { in: agentIds } } });
    await prisma.boutiqueVerification.deleteMany({ where: { agentId: { in: agentIds } } });
    await prisma.agentSubscription.deleteMany({ where: { agentId: { in: agentIds } } });
    
    if (agentIds.length > 0) {
        await prisma.agent.deleteMany({ where: { id: { in: agentIds } } });
    }
    await prisma.user.deleteMany({ where: { id: { in: usersToDelete.map(u => u.id) } } });

    console.log('Seeding exactly 8 agents...');

    for (const p of agentProfiles) {
        // Create User
        const user = await prisma.user.create({
            data: {
                fullName: p.name,
                phone: p.phone,
                email: p.name.toLowerCase().replace(' ', '.') + '@mhema.co.tz',
                password: passwordHash,
                role: 'AGENT'
            }
        });

        // Create Agent
        const agent = await prisma.agent.create({
            data: {
                userId: user.id,
                availabilityStatus: 'ONLINE',
                commissionRate: p.rate,
                rating: p.rating,
                totalDeliveries: p.count - 10,
                bio: p.bio,
                region: p.region,
                district: p.district,
                businessName: p.business,
                successRate: 95.0 + Math.random() * 5.0,
                responseRate: 90.0 + Math.random() * 10.0,
                completionRate: 94.0 + Math.random() * 6.0,
                followersCount: Math.floor(p.count * 0.8)
            }
        });

        // Create Agent Subscription
        await prisma.agentSubscription.create({
            data: {
                agentId: agent.id,
                plan: 'MONTHLY',
                amount: 30000,
                status: 'ACTIVE',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        // Create Boutique Verification (if not NONE)
        if (p.level !== 'NONE') {
            await prisma.boutiqueVerification.create({
                data: {
                    agentId: agent.id,
                    type: 'PAID',
                    status: 'APPROVED',
                    level: p.level,
                    kycCompleted: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
            });
        }

        // Create dynamic products based on the agent's specialties
        let productsData = [];
        if (p.level === 'PLATINUM' || p.level === 'GOLD') {
            productsData = [
                {
                    name: `Premium ${p.name.split(' ')[1]} Choice Item A`,
                    slug: `${p.name.toLowerCase().split(' ').join('-')}-item-a`,
                    description: `High quality sourcing item hand-picked and verified at Kariakoo market. Specially selected for durability and value.`,
                    price: 45000 + Math.floor(Math.random() * 20) * 5000,
                    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&auto=format&fit=crop&q=60',
                    views: Math.floor(Math.random() * 300) + 50,
                    clicks: Math.floor(Math.random() * 50) + 10,
                    conversions: Math.floor(Math.random() * 10)
                },
                {
                    name: `Verified ${p.name.split(' ')[1]} Choice Item B`,
                    slug: `${p.name.toLowerCase().split(' ').join('-')}-item-b`,
                    description: `Direct import class product with guaranteed quality checks before packing and transport.`,
                    price: 80000 + Math.floor(Math.random() * 25) * 5000,
                    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=60',
                    views: Math.floor(Math.random() * 200) + 30,
                    clicks: Math.floor(Math.random() * 30) + 5,
                    conversions: Math.floor(Math.random() * 5)
                }
            ];
        } else if (p.level === 'SILVER') {
            productsData = [
                {
                    name: `Standard ${p.name.split(' ')[1]} Sourced Item`,
                    slug: `${p.name.toLowerCase().split(' ').join('-')}-item`,
                    description: `Verified merchant stock product checked and cleared for logistics packaging.`,
                    price: 35000 + Math.floor(Math.random() * 15) * 5000,
                    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&auto=format&fit=crop&q=60',
                    views: Math.floor(Math.random() * 100) + 20,
                    clicks: Math.floor(Math.random() * 15) + 2,
                    conversions: Math.floor(Math.random() * 3)
                }
            ];
        }

        if (productsData.length > 0) {
            for (const prod of productsData) {
                await prisma.product.create({
                    data: {
                        agentId: agent.id,
                        name: prod.name,
                        slug: prod.slug,
                        description: prod.description,
                        price: prod.price,
                        imageUrl: prod.imageUrl,
                        views: prod.views,
                        clicks: prod.clicks,
                        conversions: prod.conversions
                    }
                });
            }
        }

        // Seed 1 Review for verification validation
        const orderId = `dummy-order-${agent.id.substring(0, 8)}`;
        await prisma.order.create({
            data: {
                id: orderId,
                customerId: customer.id,
                agentId: agent.id,
                orderNumber: `LR-SEED-${agent.id.substring(0, 6).toUpperCase()}`,
                pickupAddress: 'Kariakoo Market, Block B',
                deliveryAddress: 'Mwanza City Center',
                status: 'DELIVERED_SUCCESSFULLY',
                paymentStatus: 'CONFIRMED'
            }
        });

        await prisma.customerReview.create({
            data: {
                orderId: orderId,
                agentId: agent.id,
                customerId: customer.id,
                communication: 5,
                deliverySpeed: 5,
                professionalism: 5,
                productQuality: 4,
                overallScore: p.rating,
                comment: `Great services by ${p.name}! Super communication, very fast response, product verified correctly.`
            }
        });

        console.log(`✅ Seeded Agent: ${p.name} - ${p.level} level (${p.phone})`);
    }

    console.log('\n🎉 Successfully seeded exactly 8 agents and catalogs!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
