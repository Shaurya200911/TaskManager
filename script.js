document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-task-btn');
  const nameInput = document.getElementById('task-name');
  const dateInput = document.getElementById('due-date');
  const prioritySelect = document.getElementById('priority');
  const recurringCheckbox = document.getElementById('recurring-task');
  const labelInput = document.getElementById('label');
  const tasksList = document.getElementById('tasks');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');
  const searchInput = document.getElementById('search-input');

  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  async function loadTasks() {
    const res = await fetch('/api/tasks');
    const tasks = await res.json();
    render(tasks);
    renderCalendar(tasks);
  }

  async function addTask(task) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(task)
    });
    loadTasks();
  }

  async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
  }

  async function toggleTask(id) {
    await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
    loadTasks();
  }

  async function moveTaskToDate(taskId, newDate) {
    await fetch(`/api/tasks/${taskId}/move`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ dueDate: newDate })
    });
    loadTasks();
  }

  function render(tasks) {
    tasksList.innerHTML = '';

    if (tasks.length === 0) {
      tasksList.innerHTML = '<p class="text-center text-muted">No tasks found.</p>';
      return;
    }

    // Sort by due date and priority
    tasks.sort((a, b) => {
      if (a.dueDate === b.dueDate) {
        const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let lastGroup = '';

    tasks.forEach(task => {
      let groupTitle = '';
      if (task.dueDate < todayStr) {
        groupTitle = '⚠️ Overdue';
      } else if (task.dueDate === todayStr) {
        groupTitle = '📅 Today';
      } else if (task.dueDate === tomorrowStr) {
        groupTitle = '📅 Tomorrow';
      } else {
        groupTitle = `🗓️ ${task.dueDate}`;
      }

      if (groupTitle !== lastGroup) {
        const header = document.createElement('li');
        header.className = `list-group-item fw-bold ${groupTitle === '⚠️ Overdue' ? 'bg-danger text-white' : 'bg-light'}`;
        header.textContent = groupTitle;
        tasksList.appendChild(header);
        lastGroup = groupTitle;
      }

      const li = document.createElement('li');
      li.className = `list-group-item d-flex justify-content-between align-items-center priority-${task.priority}`;
      li.style.cursor = 'pointer';

      let badgeClass = '';
      if (task.priority === 'high') badgeClass = 'badge bg-danger';
      else if (task.priority === 'medium') badgeClass = 'badge bg-warning text-dark';
      else badgeClass = 'badge bg-primary';

      li.innerHTML = `
        <div>
          ${task.completed ? '✅' : '📌'} ${task.name}
          <span class="${badgeClass} ms-2">${task.priority.toUpperCase()}</span>
          <small class="text-muted">[${task.label}]</small>
        </div>
      `;

      if (task.completed) {
        li.classList.add('completed');
      }

      li.addEventListener('click', () => {
        toggleTask(task.id);
      });

      const btn = document.createElement('button');
      btn.textContent = '❌';
      btn.className = 'btn btn-sm btn-danger';
      btn.onclick = (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      };

      li.appendChild(btn);
      tasksList.appendChild(li);
    });
  }

  function renderCalendar(tasks) {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    const monthYear = new Date(currentYear, currentMonth, 1);
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const totalDays = lastDay.getDate();
    const startingDay = firstDay.getDay();

    document.getElementById('calendar-month').textContent = monthYear.toLocaleString('default', { month: 'long', year: 'numeric' });

    for (let i = 0; i < startingDay; i++) {
      const empty = document.createElement('div');
      calendar.appendChild(empty);
    }

    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];

      cell.innerHTML = `<h6>${day}</h6>`;

      // Allow dropping tasks onto this day cell
      cell.addEventListener('dragover', (e) => e.preventDefault());
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        moveTaskToDate(taskId, dateStr);
      });

      tasks.forEach(task => {
        if (task.dueDate === dateStr) {
          const taskDiv = document.createElement('div');
          taskDiv.textContent = task.name;

          if (task.priority === 'high') {
            taskDiv.style.backgroundColor = '#f8d7da';
            taskDiv.style.color = '#721c24';
          } else if (task.priority === 'medium') {
            taskDiv.style.backgroundColor = '#fff3cd';
            taskDiv.style.color = '#856404';
          } else {
            taskDiv.style.backgroundColor = '#d1ecf1';
            taskDiv.style.color = '#0c5460';
          }

          taskDiv.style.padding = '2px 5px';
          taskDiv.style.marginTop = '5px';
          taskDiv.style.borderRadius = '5px';
          taskDiv.style.fontSize = '12px';

          // Make task draggable
          taskDiv.draggable = true;
          taskDiv.dataset.taskId = task.id;
          taskDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
          });

          cell.appendChild(taskDiv);
        }
      });

      calendar.appendChild(cell);
    }
  }

  function showCalendar() {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(tasks => {
        renderCalendar(tasks);
      });
  }

  document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    loadTasks();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    loadTasks();
  });

  addBtn.onclick = () => {
    const name = nameInput.value.trim();
    const date = dateInput.value;
    const priority = prioritySelect.value;
    const label = labelInput.value.trim();
    const recurring = recurringCheckbox.checked;

    if (!name || !date) return alert('Fill all fields!');
    addTask({ name, dueDate: date, priority, label, recurring });

    nameInput.value = '';
    dateInput.value = '';
    prioritySelect.value = 'low';
    labelInput.value = '';
    recurringCheckbox.checked = false;
  };

  searchBtn.onclick = async () => {
    const q = searchInput.value.trim();
    if (!q) return loadTasks();
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const tasks = await res.json();
    render(tasks);
    renderCalendar(tasks);
  };

  resetBtn.onclick = () => {
    searchInput.value = '';
    loadTasks();
  };

  loadTasks();

  document.querySelector('a[href="#calendar_section"]').addEventListener('click', showCalendar);
});
