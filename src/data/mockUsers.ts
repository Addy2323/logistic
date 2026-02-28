export type UserRole = "admin" | "customer" | "agent";

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    status: "active" | "inactive";
    joinedAt: string;
    lastActive: string;
    location?: string;
    ordersCount?: number;
}

export const mockUsers: User[] = [
    {
        id: "CUST-001",
        name: "John Doe",
        email: "john@example.com",
        phone: "0712 345 678",
        role: "customer",
        status: "active",
        joinedAt: "2023-10-15T10:00:00Z",
        lastActive: "2023-12-20T15:30:00Z",
        location: "Dar es Salaam",
        ordersCount: 12,
    },
    {
        id: "CUST-002",
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "0754 987 654",
        role: "customer",
        status: "active",
        joinedAt: "2023-11-02T14:20:00Z",
        lastActive: "2023-12-21T09:15:00Z",
        location: "Arusha",
        ordersCount: 5,
    },
    {
        id: "CUST-003",
        name: "Amani Juma",
        email: "amani@example.com",
        phone: "0789 111 222",
        role: "customer",
        status: "inactive",
        joinedAt: "2023-09-20T08:45:00Z",
        lastActive: "2023-11-30T11:00:00Z",
        location: "Mwanza",
        ordersCount: 8,
    },
    {
        id: "AGENT-001",
        name: "Hamisi Bakari",
        email: "hamisi@mhema.co.tz",
        phone: "0756 312 736",
        role: "agent",
        status: "active",
        joinedAt: "2023-01-10T09:00:00Z",
        lastActive: "2023-12-21T10:00:00Z",
        location: "Kariakoo, Dar",
        ordersCount: 145,
    },
    {
        id: "AGENT-002",
        name: "Sarah Mushi",
        email: "sarah@mhema.co.tz",
        phone: "0770 312 736",
        role: "agent",
        status: "active",
        joinedAt: "2023-03-15T11:30:00Z",
        lastActive: "2023-12-21T08:45:00Z",
        location: "Posta, Dar",
        ordersCount: 89,
    },
    {
        id: "AGENT-003",
        name: "David Mwangi",
        email: "david@mhema.co.tz",
        phone: "0655 444 333",
        role: "agent",
        status: "inactive",
        joinedAt: "2023-05-20T14:00:00Z",
        lastActive: "2023-12-15T16:20:00Z",
        location: "Kariakoo, Dar",
        ordersCount: 56,
    },
];
