import { CATEGORIES, convertToMonthlyAmount, getNextPaymentDate } from "./logic.js";

const moneyFormatter = new Intl.NumberFormat("ko-KR");

export function formatMoney(amount) {
    return `${moneyFormatter.format(amount)}원`;
}

function makeElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function formatDate(date) {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function daysBetween(firstDate, secondDate) {
    const first = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const second = new Date(secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate());
    return Math.round((second - first) / 86400000);
}

export function renderSummary(elements, summary) {
    elements.monthlyTotal.textContent = formatMoney(summary.monthlyTotal);
    elements.yearlyTotal.textContent = formatMoney(summary.yearlyTotal);
    elements.weeklyTotal.textContent = formatMoney(summary.weeklyTotal);
    elements.weeklyCount.textContent = summary.weeklyCount
        ? `${summary.weeklyCount}건의 결제가 일요일까지 예정되어 있습니다`
        : "일요일까지 예정된 결제가 없습니다";
}

export function renderSubscriptions(container, subscriptions, onEdit, onDelete, today = new Date()) {
    container.replaceChildren();
    if (subscriptions.length === 0) {
        container.append(makeElement("p", "empty-state", "아직 등록된 구독이 없습니다. 오른쪽에서 구독을 추가해 주세요."));
        return;
    }

    subscriptions.forEach((subscription) => {
        const card = makeElement("article", "subscription-card");
        const details = makeElement("div", "subscription-main");
        const titleRow = makeElement("div", "subscription-title-row");
        titleRow.append(
            makeElement("span", "subscription-title", subscription.name),
            makeElement("span", "category-tag", subscription.category)
        );
        const nextDate = getNextPaymentDate(subscription, today);
        const daysLeft = daysBetween(today, nextDate);
        const paymentDetails = makeElement(
            "div",
            "subscription-details",
            `${subscription.cycle === "yearly" ? "연간" : "월간"} · ${subscription.paymentMethod} · 다음 결제 ${formatDate(nextDate)}`
        );
        const price = makeElement("div", "subscription-price", `${formatMoney(convertToMonthlyAmount(subscription))} / 월`);
        details.append(titleRow, paymentDetails, price);

        const controls = makeElement("div", "subscription-controls");
        controls.append(makeElement("span", "dday", daysLeft === 0 ? "오늘" : `D-${daysLeft}`));

        const editButton = makeElement("button", "icon-button", "수정");
        editButton.type = "button";
        editButton.setAttribute("aria-label", `${subscription.name} 수정`);
        editButton.addEventListener("click", () => onEdit(subscription.id));

        const deleteButton = makeElement("button", "icon-button icon-button-danger", "삭제");
        deleteButton.type = "button";
        deleteButton.setAttribute("aria-label", `${subscription.name} 삭제`);
        deleteButton.addEventListener("click", () => onDelete(subscription.id));

        controls.append(editButton, deleteButton);
        card.append(details, controls);
        container.append(card);
    });
}

export function renderCategories(container, summary) {
    container.replaceChildren();
    const categories = [...CATEGORIES];
    if (summary.categoryTotals["기타"]) {
        categories.push("기타");
    }
    const denominator = summary.monthlyTotal;

    categories.forEach((category) => {
        const amount = summary.categoryTotals[category] || 0;
        const percentage = denominator === 0 ? 0 : Math.round((amount / denominator) * 100);
        const item = makeElement("div", "category-item");
        const row = makeElement("div", "category-label-row");
        row.append(
            makeElement("span", "", category),
            makeElement("span", "category-value", `${formatMoney(amount)} · ${percentage}%`)
        );
        const track = makeElement("div", "progress-track");
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", `${category} 지출 비중`);
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", "100");
        track.setAttribute("aria-valuenow", String(percentage));
        const bar = makeElement("div", "progress-bar");
        bar.style.width = `${percentage}%`;
        track.append(bar);
        item.append(row, track);
        container.append(item);
    });
}
