document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-task-btn');
  const nameInput = document.getElementById('task-name');
  const dateInput = document.getElementById('due-date');
  const prioritySelect = document.getElementById('priority');
  const labelInput = document.getElementById('label');
  const recurringCheckbox = document.getElementById('recurring-task');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');
  const searchInput = document.getElementById('search-input');
  const switchViewBtn = document.getElementById('switch-view-btn');

  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let currentView = 0; // 0 = list, 1 = calendar, 2 = grid, 3 = gcal
  let currentChartType = 'line';

  let taskChartInstance = null; // for Chart.js

  async function loadTasks() {
    const res = await fetch('/api/tasks');
    const tasks = await res.json();

    showCurrentView(tasks);
    loadChart();
  }

function showCurrentView(tasks) {
  // Instantly hide all views
  document.querySelectorAll('#task_section, #calendar_section, #grid_section, #gcal_section')
    .forEach(view => {
      view.style.opacity = 0;
      view.style.display = 'none';
    });

  let targetId = '';
  if (currentView === 0) {
    renderList(tasks);
    targetId = 'task_section';
  } else if (currentView === 1) {
    renderCalendar(tasks);
    targetId = 'calendar_section';
  } else if (currentView === 2) {
    renderGrid(tasks);
    targetId = 'grid_section';
  } else if (currentView === 3) {
    renderGoogleCalendar(tasks);
    targetId = 'gcal_section';
  }

  const target = document.getElementById(targetId);
  target.style.display = 'block'; // ✅ Make it block first
  setTimeout(() => {
    target.style.opacity = 1;      // ✅ Then trigger fade in
  }, 50); // 50ms delay to allow display to settle
}

  async function addTask(task) {
    if (navigator.onLine) {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      loadTasks();
      loadChart();
    } else {
      let offlineTasks = JSON.parse(localStorage.getItem('offlineTasks')) || [];
      offlineTasks.push(task);
      localStorage.setItem('offlineTasks', JSON.stringify(offlineTasks));
      alert('You are offline. Task saved locally and will sync automatically.');
      loadTasks();
      loadChart();
    }
  }

  async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
    loadChart();
  }

  async function toggleTask(id) {
    await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
    loadTasks();
    loadChart();
  }

  async function moveTaskToDate(taskId, newDate) {
    await fetch(`/api/tasks/${taskId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: newDate })
    });
    loadTasks();
    loadChart();
  }

  function renderList(tasks) {
    const tasksList = document.getElementById('tasks');
    tasksList.innerHTML = '';

    if (tasks.length === 0) {
      tasksList.innerHTML = '<p class="text-center text-muted">No tasks found.</p>';
      return;
    }

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
          taskDiv.className = 'task-small';
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

  function renderGrid(tasks) {
    const grid = document.getElementById('grid-tasks');
    grid.innerHTML = '';

    tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'col';

      card.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${task.name}</h5>
            <p class="card-text">
              Due: ${task.dueDate}<br>
              Priority: ${task.priority}<br>
              Label: ${task.label}
            </p>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  function renderGoogleCalendar(tasks) {
    const gcal = document.querySelector('.gcal-grid');
    gcal.querySelectorAll('.gcal-day').forEach(day => day.remove());

    for (let i = 0; i < 35; i++) {
      const dayBox = document.createElement('div');
      dayBox.className = 'gcal-day';
      gcal.appendChild(dayBox);
    }

    tasks.forEach(task => {
      const randomSlot = gcal.querySelectorAll('.gcal-day')[Math.floor(Math.random() * 35)];
      const taskDiv = document.createElement('div');
      taskDiv.className = 'task-small';
      taskDiv.textContent = task.name;
      randomSlot.appendChild(taskDiv);
    });
  }

  async function loadChart() {
  const res = await fetch('/api/task-stats');
  const data = await res.json();

  const labels = Object.keys(data);
  const completed = labels.map(date => data[date].completed);
  const pending = labels.map(date => data[date].pending);

  const ctx = document.getElementById('taskChart').getContext('2d');

  if (taskChartInstance) {
    taskChartInstance.destroy();
  }

  taskChartInstance = new Chart(ctx, {
    type: currentChartType,  // <-- Use dynamic type
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Completed Tasks',
          data: completed,
          borderColor: 'green',
          backgroundColor: 'rgba(0, 128, 0, 0.3)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Pending Tasks',
          data: pending,
          borderColor: 'red',
          backgroundColor: 'rgba(255, 0, 0, 0.3)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Task Completion Over Time' }
      }
    }
  });
}

  switchViewBtn.addEventListener('click', () => {
    currentView = (currentView + 1) % 4;
    loadTasks();
  });

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
    showCurrentView(tasks);
  };

  resetBtn.onclick = () => {
    searchInput.value = '';
    loadTasks();
  };

    document.getElementById('switch-chart-btn').addEventListener('click', () => {
  currentChartType = currentChartType === 'line' ? 'bar' : 'line';  // Toggle
  loadChart();  // Reload the chart with new type
});


  window.addEventListener('online', async () => {
    let offlineTasks = JSON.parse(localStorage.getItem('offlineTasks')) || [];
    if (offlineTasks.length > 0) {
      for (let task of offlineTasks) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        });
      }
      localStorage.removeItem('offlineTasks');
      alert('✅ All offline tasks have been synced!');
      loadTasks();
      loadChart();
    }
  });

  loadTasks();
});
