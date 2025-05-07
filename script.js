document.addEventListener('DOMContentLoaded', () => {
  const addTaskButton = document.getElementById('add-task-btn');
  const deleteTaskButton = document.getElementById('deleteall');
  const taskNameInput = document.getElementById('task-name');
  const dueDateInput = document.getElementById('due-date');
  const prioritySelect = document.getElementById('priority');
  const tasksList = document.getElementById('tasks');

  function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');

    return storedTasks ? JSON.parse(storedTasks) : [];
  }

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  let tasks = loadTasks();
  renderTasks(tasks);

  // function deleteTask(taskList) {
  //   localStorage.removeItem('tasks');}
  //   tasksList.innerHTML = '';
  // });
  //
     deleteTaskButton.addEventListener('click', () => {
       localStorage.removeItem('tasks');
      tasksList.innerHTML = '';
     })

  addTaskButton.addEventListener('click', function() {
    const taskName = taskNameInput.value;
    const dueDate = dueDateInput.value;
    const priority = prioritySelect.value;

    if (taskName.trim() !== "") {
      const newTask = {
        id: Date.now(),
        name: taskName,
        dueDate: dueDate,
        priority: priority,
        completed: false
      };

      tasks.push(newTask);

      saveTasks();

      renderTasks(tasks);

      taskNameInput.value = "";
      dueDateInput.value = "";
      prioritySelect.value = "low";
    } else {
      alert("Task name cannot be empty!");
    }
  });

  function renderTasks(taskList) {
    const tasksList = document.getElementById('tasks');
    tasksList.innerHTML = '';
    taskList.forEach(task => {
      const listItem = document.createElement('li');
      const deleteTask = document.createElement('button');

      listItem.classList.add('task-item');
      listItem.dataset.taskId = task.id;

      deleteTask.dataset.id = task.id;
      deleteTask.innerHTML += "Delete task";
      deleteTask.classList.add("btn");
      deleteTask.classList.add("btn-danger");
      deleteTask.classList.add("delete-task");

      listItem.classList.add(`priority-${task.priority}`);

      if (task.completed) {
        listItem.classList.add('completed');
      }

      listItem.addEventListener('click', function() {
        listItem.classList.add('completed');
        task['completed'] = true
        saveTasks();
        //alert("Task completed successfully");

      });

       deleteTask.addEventListener('click', function() {
         event.stopPropagation();
          tasks.pop(task);
          saveTasks();
          listItem.remove()
       });

      listItem.innerHTML += `\tTask name : ${task.name}\n
                                Priority  : ${task.priority}\n
                                Due date  : ${task.dueDate}`;
      listItem.appendChild(deleteTask);
      tasksList.appendChild(listItem);
    });
  }
})