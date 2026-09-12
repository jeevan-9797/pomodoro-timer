// Core logic for Pomodoro timer, task management, and statistics

// Constants for durations (in seconds)
const DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

// DOM elements
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const totalSessionsEl = document.getElementById('total-sessions');
const completedTasksEl = document.getElementById('completed-tasks');
const timeSpentEl = document.getElementById('time-spent');

// State variables
let mode = 'work'; // 'work', 'shortBreak', 'longBreak'
let remaining = DURATIONS[mode];
let timerInterval = null;
let workSessionsCompleted = 0;
let isRunning = false;

// Storage keys
const STORAGE_KEYS = {
  tasks: 'pomodoro_tasks',
  stats: 'pomodoro_stats',
};

// Audio context for sound effects
let audioContext = null;

// Initialize AudioContext on first user interaction
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Play a beep sound using Web Audio API
function playBeep(frequency = 440, duration = 0.2) {
  if (!audioContext) {
    initAudioContext();
  }
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.5;
  
  oscillator.start();
  
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.stop(audioContext.currentTime + duration);
}

// Play start sound
function playStartSound() {
  playBeep(600, 0.1);
}

// Play pause sound
function playPauseSound() {
  playBeep(400, 0.1);
}

// Play completion sound
function playCompletionSound() {
  playBeep(800, 0.3);
  setTimeout(() => playBeep(1000, 0.3), 300);
  setTimeout(() => playBeep(1200, 0.3), 600);
}

// Load tasks from localStorage
function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.tasks);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading tasks:', e);
    return [];
  }
}

// Save tasks to localStorage
function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving tasks:', e);
  }
}

// Load stats from localStorage
function loadStats() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.stats);
    return data
      ? JSON.parse(data)
      : { totalSessions: 0, completedTasks: 0, timeSpent: 0 };
  } catch (e) {
    console.error('Error loading stats:', e);
    return { totalSessions: 0, completedTasks: 0, timeSpent: 0 };
  }
}

// Save stats to localStorage
function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
  } catch (e) {
    console.error('Error saving stats:', e);
  }
}

// Update timer display
function updateTimerDisplay() {
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

// Update body data-mode for styling
function updateBodyMode() {
  document.body.setAttribute('data-mode', mode);
}

// Update statistics UI
function updateStatsUI() {
  const stats = loadStats();
  totalSessionsEl.textContent = `Total Sessions: ${stats.totalSessions}`;
  completedTasksEl.textContent = `Completed Tasks: ${stats.completedTasks}`;
  timeSpentEl.textContent = `Time Spent: ${stats.timeSpent} minutes`;
}

// Render task list
function renderTasks() {
  const tasks = loadTasks();
  taskList.innerHTML = '';
  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';
    li.textContent = task.text;
    li.addEventListener('click', () => toggleTaskCompletion(index));
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(index);
    });
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

// Add a new task
function addTask(text) {
  const tasks = loadTasks();
  tasks.push({ text, completed: false });
  saveTasks(tasks);
  renderTasks();
}

// Toggle task completion
function toggleTaskCompletion(index) {
  const tasks = loadTasks();
  tasks[index].completed = !tasks[index].completed;
  saveTasks(tasks);
  
  // Update stats if task was just completed
  if (tasks[index].completed) {
    const stats = loadStats();
    stats.completedTasks += 1;
    saveStats(stats);
    updateStatsUI();
  }
  
  renderTasks();
}

// Delete a task
function deleteTask(index) {
  const tasks = loadTasks();
  tasks.splice(index, 1);
  saveTasks(tasks);
  renderTasks();
}

// Start the timer
function startTimer() {
  if (isRunning) return;
  
  initAudioContext();
  playStartSound();
  
  isRunning = true;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  
  timerInterval = setInterval(() => {
    remaining--;
    updateTimerDisplay();
    
    if (remaining <= 0) {
      handleModeTransition();
    }
  }, 1000);
}

// Pause the timer
function pauseTimer() {
  if (!isRunning) return;
  
  playPauseSound();
  
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

// Reset the timer
function resetTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  remaining = DURATIONS[mode];
  updateTimerDisplay();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

// Handle mode transition when timer completes
function handleModeTransition() {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  
  playCompletionSound();
  
  // Update stats
  const stats = loadStats();
  
  if (mode === 'work') {
    stats.totalSessions += 1;
    stats.timeSpent += 25; // 25 minutes for work session
    workSessionsCompleted++;
    
    // Determine next mode
    if (workSessionsCompleted % 4 === 0) {
      mode = 'longBreak';
    } else {
      mode = 'shortBreak';
    }
  } else {
    mode = 'work';
  }
  
  saveStats(stats);
  updateStatsUI();
  
  // Update UI for new mode
  remaining = DURATIONS[mode];
  updateTimerDisplay();
  updateBodyMode();
  
  // Reset button states
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

// Event listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Task form submission
document.getElementById('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (text) {
    addTask(text);
    taskInput.value = '';
  }
});

// Initialize the application
function init() {
  updateTimerDisplay();
  updateBodyMode();
  renderTasks();
  updateStatsUI();
}

// Run initialization
init();
