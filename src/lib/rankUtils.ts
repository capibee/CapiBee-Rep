export interface UserRank {
    rankLetter: 'A' | 'J' | 'S' | 'M';
    rankName: string;
    commissionRate: number;
    monthlySales: number;
}

export function calculateUserRank(userId: string, userFullName: string): UserRank {
    const savedInvoices = JSON.parse(localStorage.getItem('capibee_invoices') || '[]');
    const savedBusinesses = JSON.parse(localStorage.getItem('capibee_businesses') || '[]');
    const savedClients = JSON.parse(localStorage.getItem('capibee_clients') || '[]');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlySales = 0;

    savedInvoices.forEach((inv: any) => {
        const invDateObj = inv.createdAt || inv.date || inv.fecha;
        const invDate = invDateObj ? new Date(invDateObj) : new Date();
        if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
            // Check if this invoice belongs to the user
            let isUserInvoice = false;
            const bus = savedBusinesses.find((b: any) => b.id === inv.businessId);
            
            // Wait, also check if actualUserId == userId
            if (bus && bus.responsibleName === userFullName) {
                isUserInvoice = true;
            } else {
                const cli = savedClients.find((c: any) => c.id === inv.businessId);
                if (cli && cli.userId === userId) {
                    isUserInvoice = true;
                }
            }

            if (!isUserInvoice && inv.userId === userId) {
                isUserInvoice = true;
            }

            if (isUserInvoice && inv.status === 'Pagado') {
                const subtotal = inv.items ? inv.items.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0)
                                            : ((inv.quantity || 0) * (inv.priceUSD || 0));
                monthlySales += subtotal;
            }
        }
    });

    let rankLetter: 'A' | 'J' | 'S' | 'M' = 'A';
    let rankName = 'Aprendiz';
    let commissionRate = 0.10;

    if (monthlySales >= 16000) {
        rankLetter = 'M';
        rankName = 'Senior';
        commissionRate = 0.15;
    } else if (monthlySales >= 8000) {
        rankLetter = 'S';
        rankName = 'Master';
        commissionRate = 0.12;
    } else if (monthlySales >= 2000) {
        rankLetter = 'J';
        rankName = 'Junior';
        commissionRate = 0.10;
    }

    return { rankLetter, rankName, commissionRate, monthlySales };
}
