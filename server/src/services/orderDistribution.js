import { PrismaClient } from '@prisma/client';
import smsService from './smsService.js';

const prisma = new PrismaClient();

/**
 * Order Distribution Service
 * Implements round-robin algorithm for distributing orders among online agents
 * Uses database-persisted state to survive server restarts
 */
class OrderDistributionService {
    /**
     * Assign an order to an agent using round-robin algorithm
     * @param {string} orderId - The order ID to assign
     * @returns {Promise<{agentId?: string, queued: boolean}>}
     */
    async assignOrder(orderId) {
        try {
            // Get all online agents with capacity
            const onlineAgents = await this.getAvailableAgents();

            if (onlineAgents.length === 0) {
                // No agents available - add to queue
                await this.addToQueue(orderId);

                // Update order status to QUEUED
                await prisma.order.update({
                    where: { id: orderId },
                    data: { status: 'QUEUED' }
                });

                console.log(`Order ${orderId} queued - no agents available`);
                return { queued: true };
            }

            // Select next agent in round-robin fashion
            const agent = await this.selectNextAgent(onlineAgents);

            // Assign order to agent
            await this.assignToAgent(orderId, agent.id);

            // Create notification for agent
            await this.createAssignmentNotification(agent.userId, orderId);

            // Send SMS to agent
            try {
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    select: { orderNumber: true, pickupAddress: true, deliveryAddress: true }
                });

                if (order) {
                    await smsService.sendAgentAssignmentSms(agent, order);
                }
            } catch (smsError) {
                console.error('SMS notification failed (non-blocking):', smsError.message);
                // Don't throw - SMS failure shouldn't block order assignment
            }

            console.log(`Order ${orderId} assigned to agent ${agent.id} (user: ${agent.user.fullName})`);
            return { agentId: agent.id, agentUserId: agent.userId, queued: false };

        } catch (error) {
            console.error('Order assignment error:', error);
            throw error;
        }
    }

    /**
     * Get all available agents (online and under capacity)
     * Sorted by createdAt for consistent round-robin order
     * @returns {Promise<Array>}
     */
    async getAvailableAgents() {
        const agents = await prisma.agent.findMany({
            where: {
                availabilityStatus: 'ONLINE',
                user: {
                    status: 'ACTIVE'
                }
            },
            include: {
                user: true
            },
            orderBy: {
                createdAt: 'asc' // Consistent ordering for round-robin
            }
        });

        // Filter agents under capacity
        return agents.filter(agent => agent.currentOrderCount < agent.maxOrderCapacity);
    }

    /**
     * Select next agent using round-robin algorithm
     * Uses database-persisted lastAssignedAgentId
     * @param {Array} agents - Available agents
     * @returns {Promise<Object>} Selected agent
     */
    async selectNextAgent(agents) {
        // Safety check: if systemSettings model is not yet in the generated Prisma client
        if (!prisma.systemSettings) {
            console.warn('Prisma systemSettings model not found. Please run "npx prisma generate". Falling back to first agent.');
            return agents[0];
        }

        // Get or create system settings
        let settings = await prisma.systemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: { id: 'default' }
            });
        }

        const lastAssignedAgentId = settings.lastAssignedAgentId;

        // Find the index of the last assigned agent
        let lastIndex = -1;
        if (lastAssignedAgentId) {
            lastIndex = agents.findIndex(a => a.id === lastAssignedAgentId);
        }

        // Select the next agent in the list (round-robin)
        const nextIndex = (lastIndex + 1) % agents.length;
        const selectedAgent = agents[nextIndex];

        // Update the last assigned agent ID in database
        await prisma.systemSettings.update({
            where: { id: 'default' },
            data: { lastAssignedAgentId: selectedAgent.id }
        });

        console.log(`Round-robin: last=${lastAssignedAgentId}, selected=${selectedAgent.id} (${selectedAgent.user.fullName})`);
        return selectedAgent;
    }

    /**
     * Assign order to specific agent
     * @param {string} orderId
     * @param {string} agentId
     */
    async assignToAgent(orderId, agentId) {
        const now = new Date();

        // Update order
        await prisma.order.update({
            where: { id: orderId },
            data: {
                agentId,
                status: 'ASSIGNED',
                assignedAt: now
            }
        });

        // Increment agent's current order count
        await prisma.agent.update({
            where: { id: agentId },
            data: {
                currentOrderCount: {
                    increment: 1
                }
            }
        });
    }

    /**
     * Add order to queue
     * @param {string} orderId
     * @param {number} priority
     */
    async addToQueue(orderId, priority = 0) {
        await prisma.orderQueue.create({
            data: {
                orderId,
                priority
            }
        });
    }

    /**
     * Process queued orders when an agent becomes available
     * @param {string} agentId - Optional: process for specific agent
     * @returns {Promise<number>} Number of orders processed
     */
    async processQueue(agentId = null) {
        try {
            // Get queued orders (oldest first, highest priority first)
            const queuedOrders = await prisma.orderQueue.findMany({
                where: {
                    processedAt: null
                },
                include: {
                    order: true
                },
                orderBy: [
                    { priority: 'desc' },
                    { queuedAt: 'asc' }
                ]
            });

            if (queuedOrders.length === 0) {
                return 0;
            }

            let processedCount = 0;

            for (const queueItem of queuedOrders) {
                const result = await this.assignOrder(queueItem.order.id);

                if (!result.queued) {
                    // Mark queue item as processed
                    await prisma.orderQueue.update({
                        where: { id: queueItem.id },
                        data: { processedAt: new Date() }
                    });

                    processedCount++;
                } else {
                    // If still queued, stop processing
                    break;
                }
            }

            console.log(`Processed ${processedCount} queued orders`);
            return processedCount;

        } catch (error) {
            console.error('Queue processing error:', error);
            throw error;
        }
    }

    /**
     * Create notification for agent about new order assignment
     * @param {string} userId
     * @param {string} orderId
     */
    async createAssignmentNotification(userId, orderId) {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        await prisma.notification.create({
            data: {
                userId,
                type: 'ORDER_ASSIGNED',
                title: `New Order Assigned`,
                message: `You have been assigned order #${order.orderNumber}`,
                relatedOrderId: orderId
            }
        });
    }

    /**
     * Reassign all active orders from an agent who went offline
     * @param {string} agentId - The agent who went offline
     * @returns {Promise<number>} Number of orders reassigned
     */
    async reassignAgentOrders(agentId) {
        try {
            // Find all active orders assigned to this agent
            const activeOrders = await prisma.order.findMany({
                where: {
                    agentId,
                    status: {
                        in: ['ASSIGNED', 'PICKED', 'IN_TRANSIT']
                    }
                }
            });

            if (activeOrders.length === 0) {
                return 0;
            }

            let reassignedCount = 0;

            for (const order of activeOrders) {
                // Remove current agent assignment
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        agentId: null,
                        status: 'PLACED'
                    }
                });

                // Decrement the offline agent's order count
                await prisma.agent.update({
                    where: { id: agentId },
                    data: {
                        currentOrderCount: {
                            decrement: 1
                        }
                    }
                });

                // Try to reassign to another agent
                const result = await this.assignOrder(order.id);

                if (!result.queued) {
                    reassignedCount++;
                    console.log(`Order ${order.orderNumber} reassigned to agent ${result.agentId}`);
                } else {
                    console.log(`Order ${order.orderNumber} queued - no available agents`);
                }
            }

            return reassignedCount;

        } catch (error) {
            console.error('Reassign agent orders error:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new OrderDistributionService();
