import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
let io;

export const initializeSocket = (socketIo) => {
    io = socketIo;

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            console.error('🔴 Socket authentication error:', err.message);
            next(new Error('Authentication error'));
        }
    });


    io.on('connection', (socket) => {
        console.log(`🟢 User connected: ${socket.user.userId} (Socket ID: ${socket.id})`);

        // Join chat room
        socket.on('join_room', async (roomId) => {
            socket.join(roomId);
            console.log(`📁 User ${socket.user.userId} joined room ${roomId}`);
        });


        // Send message
        socket.on('send_message', async (data) => {
            console.log(`Received send_message from ${socket.user.userId}:`, data);
            try {
                const { chatId, content, imageUrl } = data;

                // Save to database
                const message = await prisma.chatMessage.create({
                    data: {
                        chatId,
                        senderId: socket.user.userId,
                        content,
                        imageUrl
                    },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                fullName: true,
                                role: true,
                                avatarUrl: true

                            }
                        }
                    }
                });

                // Broadcast to room
                io.to(chatId).emit('receive_message', message);

                // Update unread counts for other participants
                // This is a simplified version; ideally, we'd increment unread counts here
            } catch (error) {
                console.error('🔴 Send message error:', error);
                socket.emit('error', { message: error.message || 'Failed to send message' });
            }

        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.id}`);
        });
    });
};

export const createOrderChat = async (orderId, customerId, agentId) => {
    try {
        // Create chat room
        const chatRoom = await prisma.chatRoom.create({
            data: {
                type: 'ORDER',
                orderId,
                participants: {
                    create: [
                        { userId: customerId },
                        ...(agentId ? [{ userId: agentId }] : [])
                    ]
                }
            }
        });

        // Add admins to chat
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true }
        });

        if (admins.length > 0) {
            await prisma.chatParticipant.createMany({
                data: admins.map(admin => ({
                    chatId: chatRoom.id,
                    userId: admin.id
                }))
            });
        }

        return chatRoom;
    } catch (error) {
        console.error('Create order chat error:', error);
        throw error;
    }
};
