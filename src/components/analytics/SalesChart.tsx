import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SalesChartProps {
    data: Array<{
        date: string;
        revenue: number;
        profit: number;
        orders: number;
    }>;
    type?: 'line' | 'bar';
}

export default function SalesChart({ data, type = 'line' }: SalesChartProps) {
    if (type === 'bar') {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue (TSh)" />
                    <Bar dataKey="profit" fill="#10b981" name="Profit (TSh)" />
                </BarChart>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} name="Revenue (TSh)" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit (TSh)" />
            </LineChart>
        </ResponsiveContainer>
    );
}
