document.addEventListener('DOMContentLoaded', () => {
  const addTaskButton = document.getElementById('add-task-btn');
  const deleteTaskButton = document.getElementById('deleteall');
  const taskNameInput = document.getElementById('task-name');
  const dueDateInput = document.getElementById('due-date');
  const prioritySelect = document.getElementById('priority');
  const tasksList = document.getElementById('tasks');
  const searchButton = document.getElementById('search-btn');
  const resetButton = document.getElementById('reset-btn');
  const searchInput = document.getElementById('search-input');

  async function loadTasks() {
    const response = await fetch('/api/tasks');
    const tasks = await response.json();
    renderTasks(tasks);
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

  addTaskButton.addEventListener('click', function () {
    const taskName = taskNameInput.value;
    const dueDate = dueDateInput.value;
    const priority = prioritySelect.value;

    if (taskName.trim() && dueDate.trim()) {
      const newTask = {
        name: taskName,
        dueDate: dueDate,
        priority: priority
      };
      addTask(newTask);
      taskNameInput.value = "";
      dueDateInput.value = "";
      prioritySelect.value = "low";
    } else {
      alert("Fill all fields to add a task! :)");
    }
  });

  deleteTaskButton.addEventListener('click', async () => {
    const response = await fetch('/api/tasks');
    const tasks = await response.json();
    for (let task of tasks) {
      await deleteTask(task.id);
    }
  });

  searchButton.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) {
      loadTasks();
      return;
    }
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const tasks = await response.json();
    renderTasks(tasks);
  });

  resetButton.addEventListener('click', () => {
    searchInput.value = '';
    loadTasks();
  });

  function renderTasks(taskList) {
    tasksList.innerHTML = '';
    taskList.forEach(task => {
      const listItem = document.createElement('li');
      listItem.classList.add('task-item', `priority-${task.priority}`);
      listItem.dataset.taskId = task.id;
      if (task.completed) listItem.classList.add('completed');

      listItem.innerHTML = `
        Task name : ${task.name} | Priority : ${task.priority} | Due date : ${task.dueDate}
      `;

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete task';
      deleteButton.className = 'btn btn-danger delete-task';
      deleteButton.onclick = (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      };

      listItem.appendChild(deleteButton);
      tasksList.appendChild(listItem);
    });
  }

  loadTasks();
});
