export const CATEGORIES = ["영상", "음악", "운동", "생산성"];

export function convertToMonthlyAmount(subscription) {
    const amount = Number(subscription.amount);
    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("구독 금액은 0 이상의 숫자여야 합니다.");
    }

    if (subscription.cycle === "yearly") {
        return Math.round(amount / 12);
    }
    if (subscription.cycle === "monthly") {
        return amount;
    }
    throw new Error("결제 주기는 monthly 또는 yearly여야 합니다.");
}

export function calculateTotalMonthlyAmount(subscriptions) {
    return subscriptions.reduce(
        (total, subscription) => total + convertToMonthlyAmount(subscription),
        0
    );
}

export function calculateTotalYearlyAmount(subscriptions) {
    return calculateTotalMonthlyAmount(subscriptions) * 12;
}

function parseLocalDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error("다음 결제일 형식이 올바르지 않습니다.");
    }
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        throw new Error("다음 결제일이 올바른 날짜가 아닙니다.");
    }
    return date;
}

function dateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addOneCycle(date, cycle) {
    const targetMonth = date.getMonth() + (cycle === "monthly" ? 1 : 12);
    const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    return new Date(targetYear, normalizedMonth, Math.min(date.getDate(), lastDay));
}

export function getNextPaymentDate(subscription, referenceDate = new Date()) {
    if (subscription.cycle !== "monthly" && subscription.cycle !== "yearly") {
        throw new Error("결제 주기는 monthly 또는 yearly여야 합니다.");
    }

    const today = dateOnly(referenceDate);
    let nextDate = parseLocalDate(subscription.nextPaymentDate);
    while (nextDate < today) {
        nextDate = addOneCycle(nextDate, subscription.cycle);
    }
    return nextDate;
}

export function calculateExpenseSummary(subscriptions, referenceDate = new Date()) {
    const categoryTotals = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
    let weeklyTotal = 0;
    let weeklyCount = 0;
    const today = dateOnly(referenceDate);
    const daysUntilSunday = (7 - today.getDay()) % 7;
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + daysUntilSunday);

    subscriptions.forEach((subscription) => {
        const monthlyAmount = convertToMonthlyAmount(subscription);
        const category = CATEGORIES.includes(subscription.category) ? subscription.category : "기타";
        categoryTotals[category] = (categoryTotals[category] || 0) + monthlyAmount;

        const nextPaymentDate = getNextPaymentDate(subscription, today);
        if (nextPaymentDate <= weekEnd) {
            weeklyTotal += Number(subscription.amount);
            weeklyCount += 1;
        }
    });

    const monthlyTotal = calculateTotalMonthlyAmount(subscriptions);
    return {
        monthlyTotal,
        yearlyTotal: calculateTotalYearlyAmount(subscriptions),
        weeklyTotal,
        weeklyCount,
        categoryTotals
    };
}
