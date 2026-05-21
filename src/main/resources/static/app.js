const paginationState = {
    page: 0,
    size: 30,
    totalPages: 0,
    totalElements: 0
};

document.addEventListener('DOMContentLoaded', () => {
    loadPodInfo();
    setupPaginationControls();
    loadEmployees();

    document.getElementById('employee-form').addEventListener('submit', async function (event) {
        event.preventDefault();

        const payload = {
            firstName: document.getElementById('emp-first-name').value.trim(),
            lastName: document.getElementById('emp-last-name').value.trim(),
            email: document.getElementById('emp-email').value.trim(),
            phone: document.getElementById('emp-phone').value.trim() || null,
            department: document.getElementById('emp-department').value.trim(),
            position: document.getElementById('emp-position').value.trim(),
            salary: Number(document.getElementById('emp-salary').value),
            hireDate: document.getElementById('emp-hire-date').value
        };

        try {
            await request('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            showFeedback('Employee created successfully', false);
            this.reset();
            paginationState.page = 0;
            await loadEmployees();
        } catch (error) {
            showFeedback(error.message, true);
        }
    });
});

async function loadEmployees() {
    try {
        const response = await request(`/api/employees?page=${paginationState.page}&size=${paginationState.size}`);
        const normalized = normalizeEmployeesResponse(response);
        paginationState.totalPages = normalized.totalPages;
        paginationState.totalElements = normalized.totalElements;
        updateUI(normalized.employees);
        renderPaginationInfo();
    } catch (error) {
        showFeedback(error.message, true);
    }
}

async function loadPodInfo() {
    try {
        const info = await request('/api/info');
        document.getElementById('pod-name').textContent = 'Pod: ' + info.podName;
        document.getElementById('node-name').textContent = 'Nodo: ' + info.nodeName;
    } catch (error) {
        document.getElementById('pod-name').textContent = 'Pod info no disponible';
    }
}

function normalizeEmployeesResponse(response) {
    if (Array.isArray(response)) {
        return {
            employees: response,
            totalPages: response.length > 0 ? 1 : 0,
            totalElements: response.length
        };
    }

    if (Array.isArray(response?.content)) {
        return {
            employees: response.content,
            totalPages: Number.isInteger(response.totalPages) ? response.totalPages : 0,
            totalElements: Number.isInteger(response.totalElements) ? response.totalElements : response.content.length
        };
    }

    return {
        employees: [],
        totalPages: 0,
        totalElements: 0
    };
}

function setupPaginationControls() {
    document.getElementById('prev-page').addEventListener('click', async () => {
        if (paginationState.page === 0) {
            return;
        }
        paginationState.page -= 1;
        await loadEmployees();
    });

    document.getElementById('next-page').addEventListener('click', async () => {
        if (paginationState.page >= Math.max(0, paginationState.totalPages - 1)) {
            return;
        }
        paginationState.page += 1;
        await loadEmployees();
    });

}

function renderPaginationInfo() {
    const currentPage = paginationState.totalPages === 0 ? 0 : paginationState.page + 1;
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${paginationState.totalPages}`;
    document.getElementById('total-info').textContent = `${paginationState.totalElements} employees`;

    document.getElementById('prev-page').disabled = paginationState.page === 0;
    document.getElementById('next-page').disabled = paginationState.page >= Math.max(0, paginationState.totalPages - 1);
}

function updateUI(employees) {
    const tbody = document.querySelector('#employee-table tbody');
    tbody.innerHTML = '';

    if (!Array.isArray(employees)) {
        return;
    }

    employees.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.employeeCode}</td>
            <td>${emp.firstName}</td>
            <td>${emp.lastName}</td>
            <td>${emp.email}</td>
            <td>${emp.phone ?? ''}</td>
            <td>${emp.department}</td>
            <td>${emp.position}</td>
            <td>${Number(emp.salary).toFixed(2)}</td>
            <td>${emp.hireDate}</td>
            <td>
                <div class="actions">
                    <button type="button" class="btn-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteEmployee(id) {
    try {
        await request(`/api/employees/${id}`, { method: 'DELETE' });
        showFeedback('Employee deleted', false);
        const isPageOutOfBounds = paginationState.page > 0 && paginationState.page >= paginationState.totalPages - 1;
        if (isPageOutOfBounds) {
            paginationState.page -= 1;
        }
        await loadEmployees();
    } catch (error) {
        showFeedback(error.message, true);
    }
}

async function request(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 204) {
        return null;
    }
    const body = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null;
    if (!response.ok) {
        throw new Error(body?.message || 'Request failed');
    }
    return body;
}

function showFeedback(message, isError) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.classList.remove('success', 'error');
    feedback.classList.add(isError ? 'error' : 'success');
}
