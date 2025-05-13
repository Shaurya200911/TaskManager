document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-task-btn');
  const deleteAll = document.getElementById('deleteall');
  const nameInput = document.getElementById('task-name');
  const dateInput = document.getElementById('due-date');
  const prioritySelect = document.getElementById('priority');
  const tasksList = document.getElementById('tasks');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');
  const searchInput = document.getElementById('search-input');

  async function loadTasks() {
    const res = await fetch('/api/tasks');
    const tasks = await res.json();
    render(tasks);
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

 function render(tasks) {
  tasksList.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between align-items-center priority-${task.priority}`;
    li.textContent = `📌 ${task.name} — Due: ${task.dueDate} — Priority: ${task.priority}`;
    li.style.cursor = 'pointer';

    // ✅ Add strike-through class if completed
    if (task.completed) {
      li.classList.add('completed');
    }

    // ✅ Toggle complete on click
    li.addEventListener('click', () => {
      fetch(`/api/tasks/${task.id}/toggle`, { method: 'PATCH' }).then(loadTasks);
    });

    // ❌ Delete button (stopPropagation to prevent toggle)
    const btn = document.createElement('button');
    btn.textContent = '❌';
    btn.className = 'btn btn-sm btn-danger';
    btn.onclick = (e) => {
      e.stopPropagation(); // ⛔ don’t trigger toggle
      deleteTask(task.id);
    };

    li.appendChild(btn);
    tasksList.appendChild(li);
  });
}



  addBtn.onclick = () => {
    const name = nameInput.value.trim();
    const date = dateInput.value;
    const priority = prioritySelect.value;
    if (!name || !date) return alert('Fill all fields!');
    addTask({ name, dueDate: date, priority });
    nameInput.value = '';
    dateInput.value = '';
    prioritySelect.value = 'low';
  };

  searchBtn.onclick = async () => {
    const q = searchInput.value.trim();
    if (!q) return loadTasks();
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const tasks = await res.json();
    render(tasks);
  };

  resetBtn.onclick = () => {
    searchInput.value = '';
    loadTasks();
  };

  loadTasks();
});

searchBtn.onclick = async () => {
  const q = searchInput.value.trim();
  if (!q) return loadTasks();

  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  const tasks = await res.json();
  render(tasks);
};

const recurringCheckbox = document.getElementById('recurring-task');

addBtn.onclick = () => {
  const name = nameInput.value.trim();
  const date = dateInput.value;
  const priority = prioritySelect.value;
  const recurring = recurringCheckbox.checked;

  if (!name || !date) return alert('Fill all fields!');
  addTask({ name, dueDate: date, priority, recurring });

  // Reset form
  nameInput.value = '';
  dateInput.value = '';
  prioritySelect.value = 'low';
  recurringCheckbox.checked = false;
};
