import {
    calculateExpenseSummary,
    getNextPaymentDate
} from "./logic.js";
import {
    formatMoney,
    renderCategories,
    renderSubscriptions,
    renderSummary
} from "./ui.js";

const STORAGE_KEY = "subscription-tracker-data";
const form = document.querySelector("#subscription-form");
const listElement = document.querySelector("#subscription-list");
const categoryElement = document.querySelector("#category-list");
const statusElement = document.querySelector("#status-message");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const formTitle = document.querySelector("#form-title");
const countElement = document.querySelector("#subscription-count");
const fields = {
    name: document.querySelector("#name"),
    amount: document.querySelector("#amount"),
    cycle: document.querySelector("#cycle"),
    category: document.querySelector("#category"),
    nextPaymentDate: document.querySelector("#next-payment-date"),
    paymentMethod: document.querySelector("#payment-method")
};
const summaryElements = {
    monthlyTotal: document.querySelector("#monthly-total"),
    yearlyTotal: document.querySelector("#yearly-total"),
    weeklyTotal: document.querySelector("#weekly-total"),
    weeklyCount: document.querySelector("#weekly-count")
};

let subscriptions = [];
let editingId = null;
let storageAvailable = true;

function setStatus(message = "") {
    statusElement.textContent = message;
    statusElement.hidden = !message;
}

function loadSubscriptions() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            return [];
        }
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
            throw new Error("저장된 구독 데이터가 목록 형식이 아닙니다.");
        }
        parsed.forEach((subscription) => {
            if (!subscription || typeof subscription !== "object" ||
                typeof subscription.id !== "string" ||
                typeof subscription.name !== "string" ||
                !Number.isFinite(Number(subscription.amount))) {
                throw new Error("저장된 구독 데이터에 올바르지 않은 항목이 있습니다.");
            }
            getNextPaymentDate(subscription);
        });
        return parsed;
    } catch (error) {
        storageAvailable = false;
        setStatus(`저장된 구독 정보를 불러오지 못했습니다. 브라우저 저장 공간과 데이터를 확인해 주세요. (${error.message})`);
        return [];
    }
}

function saveSubscriptions(nextSubscriptions) {
    if (!storageAvailable) {
        setStatus("저장된 데이터에 문제가 있어 변경 내용을 저장할 수 없습니다.");
        return false;
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSubscriptions));
        return true;
    } catch (error) {
        setStatus(`구독 정보를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요. (${error.message})`);
        return false;
    }
}

function render() {
    const summary = calculateExpenseSummary(subscriptions);
    renderSummary(summaryElements, summary);
    renderSubscriptions(listElement, subscriptions, startEditing, deleteSubscription);
    renderCategories(categoryElement, summary);
    countElement.textContent = `${subscriptions.length}개`;
}

function resetForm() {
    form.reset();
    editingId = null;
    formTitle.textContent = "새 구독 추가";
    submitButton.textContent = "구독 추가";
    cancelEditButton.hidden = true;
}

function startEditing(id) {
    const subscription = subscriptions.find((item) => item.id === id);
    if (!subscription) {
        setStatus("수정할 구독을 찾을 수 없습니다.");
        return;
    }
    editingId = id;
    fields.name.value = subscription.name;
    fields.amount.value = subscription.amount;
    fields.cycle.value = subscription.cycle;
    fields.category.value = subscription.category;
    fields.nextPaymentDate.value = subscription.nextPaymentDate;
    fields.paymentMethod.value = subscription.paymentMethod;
    formTitle.textContent = "구독 수정";
    submitButton.textContent = "변경 저장";
    cancelEditButton.hidden = false;
    fields.name.focus();
}

function deleteSubscription(id) {
    const subscription = subscriptions.find((item) => item.id === id);
    if (!subscription || !window.confirm(`${subscription.name} 구독을 삭제할까요?`)) {
        return;
    }
    const updated = subscriptions.filter((item) => item.id !== id);
    if (saveSubscriptions(updated)) {
        subscriptions = updated;
        if (editingId === id) {
            resetForm();
        }
        setStatus("");
        render();
    }
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
        return;
    }

    const existing = editingId
        ? subscriptions.find((item) => item.id === editingId)
        : null;
    const subscription = {
        id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        name: fields.name.value.trim(),
        amount: Number(fields.amount.value),
        cycle: fields.cycle.value,
        category: fields.category.value,
        nextPaymentDate: fields.nextPaymentDate.value,
        paymentMethod: fields.paymentMethod.value
    };

    if (!subscription.name || !Number.isFinite(subscription.amount) || subscription.amount <= 0) {
        setStatus("이름과 0보다 큰 결제 금액을 입력해 주세요.");
        return;
    }

    try {
        getNextPaymentDate(subscription);
        const updated = existing
            ? subscriptions.map((item) => item.id === editingId ? subscription : item)
            : [...subscriptions, subscription];
        if (saveSubscriptions(updated)) {
            subscriptions = updated;
            resetForm();
            setStatus("");
            render();
        }
    } catch (error) {
        setStatus(`구독 정보를 확인해 주세요. (${error.message})`);
    }
});

cancelEditButton.addEventListener("click", () => {
    resetForm();
    setStatus("");
});

subscriptions = loadSubscriptions();
render();
