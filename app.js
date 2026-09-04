const STORAGE_KEY = "ledger-study-planner";
const COLORS = ["#6d55d9", "#3a9d8f", "#e98b5e", "#4e80d8", "#d66aa2", "#7d9b52", "#c18c3a"];
const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"courses":[],"assignments":[]}');
state.courses ||= [];
state.assignments ||= [];
let currentView = "dashboard";
let editing = null;

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const courseFor = (id) => state.courses.find((course) => course.id === id);
const isOverdue = (assignment) => assignment.status !== "completed" && assignment.dueDate && new Date(`${assignment.dueDate}T23:59:59`) < new Date();
const formatDate = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No due date";
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const stats = () => {
  const graded = state.assignments.filter((item) => item.grade !== null && item.grade !== "" && !Number.isNaN(Number(item.grade)));
  return { total: state.assignments.length, completed: state.assignments.filter((item) => item.status === "completed").length, remaining: state.assignments.filter((item) => item.status !== "completed").length, overdue: state.assignments.filter(isOverdue).length, average: graded.length ? Math.round(graded.reduce((sum, item) => sum + Number(item.grade), 0) / graded.length) : null };
};
const notificationItems = () => {
  const now = Date.now();
  const cutoff = now + 48 * 60 * 60 * 1000;
  return state.assignments.filter((item) => {
    if (!item.dueDate || item.status === "completed") return false;
    const due = new Date(`${item.dueDate}T23:59:59`).getTime();
    return due < now || due <= cutoff;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};
const applyTheme = () => document.documentElement.classList.toggle("dark-mode", localStorage.getItem(`${STORAGE_KEY}-dark-mode`) === "true");
const gradeChart = () => {
  const courses = state.courses.map((course) => {
    const grades = state.assignments.filter((item) => item.courseId === course.id && item.grade !== null && item.grade !== "" && !Number.isNaN(Number(item.grade)));
    return { course, average: grades.length ? Math.round(grades.reduce((sum, item) => sum + Number(item.grade), 0) / grades.length) : null };
  }).filter((item) => item.average !== null);
  if (!courses.length) return `<div class="empty-state"><h3>No graded assignments</h3><p>Add grades to see course averages here.</p></div>`;
  const width = Math.max(360, courses.length * 92);
  return `<svg class="grade-chart" viewBox="0 0 ${width} 190" role="img" aria-label="Grade averages by course"><line x1="30" y1="155" x2="${width - 20}" y2="155" stroke="var(--color-border)"/>${courses.map(({ course, average }, index) => { const height = average * 1.15; const x = 50 + index * 92; return `<rect class="grade-bar" x="${x}" y="${155 - height}" width="38" height="${height}" rx="6" style="fill:${course.color}"><title>${escapeHtml(course.code)}: ${average}%</title></rect><text class="grade-value" x="${x + 19}" y="${145 - height}">${average}%</text><text class="grade-label" x="${x + 19}" y="176">${escapeHtml(course.code)}</text>`; }).join("")}</svg>`;
};
const courseOptions = (selected = "") => state.courses.map((course) => `<option value="${course.id}" ${course.id === selected ? "selected" : ""}>${escapeHtml(course.code)} · ${escapeHtml(course.name)}</option>`).join("");
const statusOptions = (selected) => ["not started", "in progress", "completed"].map((value) => `<option ${value === selected ? "selected" : ""} value="${value}">${value.replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>`).join("");
const priorityOptions = (selected) => ["low", "medium", "high"].map((value) => `<option ${value === selected ? "selected" : ""} value="${value}">${value[0].toUpperCase() + value.slice(1)} priority</option>`).join("");

function render() {
  const page = { dashboard: "Dashboard", courses: "Courses", assignments: "Assignments", calendar: "Calendar" }[currentView];
  $("#page-title").textContent = page;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === currentView));
  const views = { dashboard: renderDashboard, courses: renderCourses, assignments: renderAssignments, calendar: renderCalendar };
  $("#app-view").innerHTML = views[currentView]();
  bindViewEvents();
  updateNotifications();
}

function renderDashboard() {
  const s = stats();
  const statCards = [["Total assignments", s.total, "icon-check"], ["Completed", s.completed, "icon-trend"], ["Remaining", s.remaining, "icon-calendar"], ["Overdue", s.overdue, "icon-alert"], ["Average grade", s.average === null ? "—" : `${s.average}%`, "icon-trend"]];
  const progress = state.courses.map((course) => {
    const items = state.assignments.filter((item) => item.courseId === course.id);
    const completed = items.filter((item) => item.status === "completed").length;
    return `<div class="course-progress-row"><div class="row-top"><span class="course-name"><i class="course-dot" style="background:${course.color}"></i>${escapeHtml(course.name)}</span><span class="small muted">${completed}/${items.length} complete</span></div><div class="progress-track"><div class="progress-fill" style="width:${items.length ? completed / items.length * 100 : 0}%;background:${course.color}"></div></div></div>`;
  }).join("");
  const upcoming = [...state.assignments].filter((item) => item.status !== "completed").sort((a, b) => (a.dueDate || "z").localeCompare(b.dueDate || "z")).slice(0, 4);
  return `<div class="stats-grid">${statCards.map(([label, value, icon], index) => `<div class="stat-card ${index === 3 ? "warning" : ""}" style="animation-delay:${index * 50}ms"><div class="stat-label">${label}<span class="stat-icon"><svg><use href="#${icon}"></use></svg></span></div><strong class="stat-value">${value}</strong></div>`).join("")}</div>
    <div class="dashboard-grid"><section class="panel"><div class="section-heading"><div><h2>Course progress</h2><p>Keep momentum across your semester.</p></div><button class="button ghost" data-go="courses">View courses <svg><use href="#icon-arrow"></use></svg></button></div>${progress || `<div class="empty-state"><h3>No courses yet</h3><p>Add your first course to start tracking progress.</p><button class="button primary" data-action="add-course">Add course</button></div>`}</section><section class="panel"><div class="section-heading"><div><h2>Up next</h2><p>Your next assignments at a glance.</p></div><button class="button ghost" data-go="assignments">View all <svg><use href="#icon-arrow"></use></svg></button></div><div class="assignment-list">${upcoming.length ? upcoming.map(assignmentCard).join("") : `<div class="empty-state"><h3>Clear schedule</h3><p>There are no unfinished assignments.</p></div>`}</div></section></div>
    <div class="insights-grid"><section class="panel"><div class="section-heading"><div><h2>Grade insights</h2><p>Average of graded work by course.</p></div></div>${gradeChart()}</section><section class="panel"><div class="section-heading"><div><h2>Planning note</h2><p>Stay ahead of the next deadline.</p></div></div><div class="empty-state"><h3>${stats().overdue ? `${stats().overdue} deadline${stats().overdue === 1 ? "" : "s"} need attention` : "You are on track"}</h3><p>${stats().overdue ? "Review overdue work from the notification bell." : "Use Calendar to see your workload by day."}</p></div></section></div>`;
}

function renderCalendar() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const cells = [];
  for (let index = 0; index < start.getDay(); index += 1) cells.push(`<div class="calendar-cell"></div>`);
  for (let day = 1; day <= end.getDate(); day += 1) {
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const items = state.assignments.filter((item) => item.dueDate === date);
    const isToday = day === today.getDate();
    cells.push(`<div class="calendar-cell ${isToday ? "today" : ""}"><span class="calendar-number">${day}</span>${items.map((item) => { const course = courseFor(item.courseId); return `<button class="calendar-assignment" style="--course-color:${course?.color || COLORS[0]}" data-jump-id="${item.id}" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</button>`; }).join("")}</div>`);
  }
  return `<div class="calendar-toolbar"><div><h2>${today.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><p class="muted">Assignments plotted by due date.</p></div><button class="button primary" data-action="add-assignment"><svg><use href="#icon-plus"></use></svg> Add assignment</button></div><section class="panel"><div class="calendar-grid"><div class="calendar-day-header">Sun</div><div class="calendar-day-header">Mon</div><div class="calendar-day-header">Tue</div><div class="calendar-day-header">Wed</div><div class="calendar-day-header">Thu</div><div class="calendar-day-header">Fri</div><div class="calendar-day-header">Sat</div>${cells.join("")}</div>${state.assignments.length ? "" : `<div class="empty-state" style="margin-top:18px"><h3>No assignments scheduled</h3><p>Add an assignment with a due date to populate your calendar.</p></div>`}</section>`;
}

function updateNotifications() {
  const items = notificationItems();
  const badge = $("#notification-badge");
  badge.textContent = items.length;
  badge.hidden = !items.length;
  $("#notification-dropdown").innerHTML = items.length ? items.map((item) => `<button class="notification-item" data-notification-id="${item.id}"><strong>${isOverdue(item) ? "Overdue: " : "Due soon: "}${escapeHtml(item.title)}</strong><small>${formatDate(item.dueDate)} · ${escapeHtml(courseFor(item.courseId)?.code || "Unassigned")}</small></button>`).join("") : `<div class="empty-state"><h3>Nothing urgent</h3><p>No deadlines in the next 48 hours.</p></div>`;
}

function assignmentCard(item) {
  const course = courseFor(item.courseId);
  return `<article class="assignment-card ${item.opened ? "" : "unopened"}" style="--course-color:${course?.color || COLORS[0]}"><div class="row-top"><h3>${item.opened ? "" : '<span class="unread-dot" title="Unread"></span>'}${escapeHtml(item.title)}</h3><div class="card-actions"><select class="select-inline" data-field="priority" data-id="${item.id}" aria-label="Priority">${priorityOptions(item.priority)}</select><button class="button ghost" data-action="edit-assignment" data-id="${item.id}" aria-label="Edit assignment"><svg><use href="#icon-edit"></use></svg></button><button class="button ghost" data-action="delete-assignment" data-id="${item.id}" aria-label="Delete assignment"><svg><use href="#icon-trash"></use></svg></button></div></div><div class="assignment-meta"><span>${course ? `<i class="course-dot" style="background:${course.color}"></i>${escapeHtml(course.code)}` : "Unassigned"}</span><span class="${isOverdue(item) ? "overdue" : ""}"><svg><use href="#icon-calendar"></use></svg>${isOverdue(item) ? "Overdue · " : ""}${formatDate(item.dueDate)}</span><span class="chip ${item.priority}">${item.priority}</span><select class="select-inline" data-field="status" data-id="${item.id}" aria-label="Status">${statusOptions(item.status)}</select>${item.grade !== null && item.grade !== "" ? `<span>${item.grade}%</span>` : ""}</div></article>`;
}

function renderCourses() {
  return `<div class="section-heading"><div><h2>Your courses</h2><p>${state.courses.length} course${state.courses.length === 1 ? "" : "s"} in your ledger.</p></div><button class="button primary" data-action="add-course"><svg><use href="#icon-plus"></use></svg> Add course</button></div><div class="course-grid">${state.courses.length ? state.courses.map((course, index) => { const items = state.assignments.filter((item) => item.courseId === course.id); const done = items.filter((item) => item.status === "completed").length; return `<article class="course-card" style="--course-color:${course.color};animation-delay:${index * 45}ms"><div class="course-title"><i class="course-dot" style="background:${course.color}"></i><div><div class="course-code">${escapeHtml(course.code)}</div><h3>${escapeHtml(course.name)}</h3></div></div><p>${escapeHtml(course.instructor || "No instructor")} · ${course.credits || 0} credits</p><div class="course-stats"><div><strong>${items.length}</strong><span>Assignments</span></div><div><strong>${done}</strong><span>Completed</span></div></div><div class="card-actions"><button class="button secondary" data-action="edit-course" data-id="${course.id}"><svg><use href="#icon-edit"></use></svg> Edit</button><button class="button ghost" data-action="delete-course" data-id="${course.id}" aria-label="Delete ${escapeHtml(course.name)}"><svg><use href="#icon-trash"></use></svg></button></div></article>`; }).join("") : `<div class="empty-state" style="grid-column:1/-1"><h3>Build your semester</h3><p>Create a course to organize assignments and see grade progress.</p><button class="button primary" data-action="add-course">Add course</button></div>`}</div>`;
}

function renderAssignments() {
  return `<div class="section-heading"><div><h2>All assignments</h2><p>Manage deadlines, priorities, and grades in one place.</p></div><button class="button primary" data-action="add-assignment"><svg><use href="#icon-plus"></use></svg> Add assignment</button></div><div class="toolbar"><input id="assignment-search" placeholder="Search assignments..." aria-label="Search assignments"><select id="assignment-filter"><option value="all">All statuses</option>${statusOptions("").replace(' selected', '')}</select></div><div id="assignment-results" class="assignment-list">${state.assignments.length ? state.assignments.map(assignmentCard).join("") : `<div class="empty-state"><h3>No assignments yet</h3><p>Add an assignment to begin planning your workload.</p></div>`}</div>`;
}

function bindViewEvents() {
  document.querySelectorAll("[data-go]").forEach((el) => el.addEventListener("click", () => { currentView = el.dataset.go; render(); }));
  document.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", () => actions(el.dataset.action, el.dataset.id)));
  document.querySelectorAll("[data-field]").forEach((el) => el.addEventListener("change", () => { const item = state.assignments.find((assignment) => assignment.id === el.dataset.id); if (item) { const wasPerfect = item.status === "completed" && Number(item.grade) === 100; item[el.dataset.field] = el.value; if (!wasPerfect && item.status === "completed" && Number(item.grade) === 100) showConfetti(); save(); render(); } }));
  document.querySelectorAll("[data-jump-id]").forEach((el) => el.addEventListener("click", () => jumpToAssignment(el.dataset.jumpId)));
  document.querySelectorAll(".assignment-card").forEach((el) => el.addEventListener("click", (event) => { if (event.target.closest("select,button")) return; const title = el.querySelector("h3"); const item = state.assignments.find((assignment) => title.textContent.includes(assignment.title)); if (item && !item.opened) { item.opened = true; save(); render(); } }));
  const search = $("#assignment-search"), filter = $("#assignment-filter");
  const updateList = () => { if (!search) return; const query = search.value.toLowerCase(); const status = filter.value; $("#assignment-results").innerHTML = state.assignments.filter((item) => item.title.toLowerCase().includes(query) && (status === "all" || item.status === status)).map(assignmentCard).join("") || `<div class="empty-state"><h3>No matches</h3><p>Try a different search or filter.</p></div>`; bindViewEvents(); };
  search?.addEventListener("input", updateList); filter?.addEventListener("change", updateList);
}

function jumpToAssignment(id) {
  currentView = "assignments";
  render();
  const card = document.querySelector(`[data-action="edit-assignment"][data-id="${id}"]`)?.closest(".assignment-card");
  card?.scrollIntoView({ behavior: "smooth", block: "center" });
  card?.animate([{ boxShadow: "0 0 0 4px var(--color-accent)" }, { boxShadow: "none" }], { duration: 900 });
  const item = state.assignments.find((assignment) => assignment.id === id);
  if (item && !item.opened) { item.opened = true; save(); render(); }
}

function actions(action, id) {
  if (action === "add-course") openModal("course");
  if (action === "edit-course") openModal("course", courseFor(id));
  if (action === "delete-course" && confirm("Delete this course and its assignments?")) { state.courses = state.courses.filter((course) => course.id !== id); state.assignments = state.assignments.filter((item) => item.courseId !== id); save(); render(); }
  if (action === "add-assignment") {
    if (!state.courses.length) { alert("Add a course before creating an assignment."); return; }
    openModal("assignment");
  }
  if (action === "edit-assignment") openModal("assignment", state.assignments.find((item) => item.id === id));
  if (action === "delete-assignment" && confirm("Delete this assignment?")) { state.assignments = state.assignments.filter((item) => item.id !== id); save(); render(); }
}

function openModal(type, item = null) {
  editing = { type, id: item?.id || null };
  $("#modal-kicker").textContent = item ? `EDIT ${type.toUpperCase()}` : `NEW ${type.toUpperCase()}`;
  $("#modal-title").textContent = `${item ? "Edit" : "Add"} ${type}`;
  $("#modal-form").innerHTML = type === "course" ? `<div class="form-grid"><div class="form-field"><label for="course-name">Course name</label><input id="course-name" name="name" required value="${escapeHtml(item?.name)}" placeholder="e.g. Cognitive Science"></div><div class="form-field"><label for="course-code">Course code</label><input id="course-code" name="code" required value="${escapeHtml(item?.code)}" placeholder="e.g. PSY 201"></div><div class="form-field"><label for="course-instructor">Instructor</label><input id="course-instructor" name="instructor" value="${escapeHtml(item?.instructor)}" placeholder="e.g. Dr. Rivera"></div><div class="form-field"><label for="course-credits">Credits</label><input id="course-credits" name="credits" type="number" min="0" max="12" value="${item?.credits || 3}"></div><div class="form-field full"><label for="course-color">Accent color</label><div class="color-row"><input id="course-color" name="color" type="color" value="${item?.color || COLORS[state.courses.length % COLORS.length]}"><span class="muted small">Used for course borders, badges, and progress.</span></div></div></div><div class="modal-actions"><button type="button" class="button secondary" data-close-modal>Cancel</button><button class="button primary">${item ? "Save changes" : "Create course"}</button></div>` : `<div class="form-grid"><div class="form-field full"><label for="assignment-title">Assignment title</label><input id="assignment-title" name="title" required value="${escapeHtml(item?.title)}" placeholder="e.g. Reading response"></div><div class="form-field"><label for="assignment-course">Course</label><select id="assignment-course" name="courseId" required>${courseOptions(item?.courseId)}</select></div><div class="form-field"><label for="assignment-due">Due date</label><input id="assignment-due" name="dueDate" type="date" value="${item?.dueDate || ""}" required></div><div class="form-field"><label for="assignment-priority">Priority</label><select id="assignment-priority" name="priority">${priorityOptions(item?.priority || "medium")}</select></div><div class="form-field"><label for="assignment-status">Status</label><select id="assignment-status" name="status">${statusOptions(item?.status || "not started")}</select></div><div class="form-field"><label for="assignment-grade">Grade (%)</label><input id="assignment-grade" name="grade" type="number" min="0" max="100" step="0.1" value="${item?.grade ?? ""}" placeholder="Optional"></div><div class="form-field full"><label for="assignment-notes">Notes</label><textarea id="assignment-notes" name="notes" placeholder="Add helpful details...">${escapeHtml(item?.notes)}</textarea></div></div><div class="modal-actions"><button type="button" class="button secondary" data-close-modal>Cancel</button><button class="button primary">${item ? "Save changes" : "Create assignment"}</button></div>`;
  $("#modal-backdrop").hidden = false;
  $("#modal-form").querySelector("[data-close-modal]")?.addEventListener("click", closeModal);
  $("#modal-form").addEventListener("submit", submitModal);
  $("#modal-form").querySelector("input")?.focus();
}
function closeModal() { $("#modal-backdrop").hidden = true; editing = null; }
function submitModal(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  if (editing.type === "course") { const course = { id: editing.id || uid("course"), name: data.name.trim(), code: data.code.trim(), instructor: data.instructor.trim(), color: data.color, credits: Number(data.credits) || 0 }; const index = state.courses.findIndex((item) => item.id === editing.id); index >= 0 ? state.courses.splice(index, 1, course) : state.courses.push(course); }
  else { const previous = state.assignments.find((item) => item.id === editing.id); const assignment = { id: editing.id || uid("assignment"), courseId: data.courseId, title: data.title.trim(), dueDate: data.dueDate, priority: data.priority, status: data.status, grade: data.grade === "" ? null : Number(data.grade), opened: editing.id ? previous?.opened ?? true : false, notes: data.notes.trim() }; const index = state.assignments.findIndex((item) => item.id === editing.id); index >= 0 ? state.assignments.splice(index, 1, assignment) : state.assignments.push(assignment); if (assignment.status === "completed" && assignment.grade === 100 && (previous?.status !== "completed" || previous?.grade !== 100)) showConfetti(); }
  save(); closeModal(); render();
}

document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => { currentView = item.dataset.view; render(); }));
$("#quick-add-course").addEventListener("click", () => openModal("course"));
$("#quick-add-assignment").addEventListener("click", () => { if (!state.courses.length) { alert("Add a course before creating an assignment."); return; } openModal("assignment"); });
$("#modal-close").addEventListener("click", closeModal);
$("#modal-backdrop").addEventListener("click", (event) => { if (event.target.id === "modal-backdrop") closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#modal-backdrop").hidden) closeModal(); });
$("#notification-button").addEventListener("click", () => { const dropdown = $("#notification-dropdown"); dropdown.hidden = !dropdown.hidden; $("#notification-button").setAttribute("aria-expanded", String(!dropdown.hidden)); });
$("#notification-dropdown").addEventListener("click", (event) => { const target = event.target.closest("[data-notification-id]"); if (target) { $("#notification-dropdown").hidden = true; jumpToAssignment(target.dataset.notificationId); } });
document.addEventListener("click", (event) => { if (!event.target.closest(".notification-wrap")) { $("#notification-dropdown").hidden = true; } });
$("#theme-toggle").addEventListener("click", () => { const dark = localStorage.getItem(`${STORAGE_KEY}-dark-mode`) !== "true"; localStorage.setItem(`${STORAGE_KEY}-dark-mode`, String(dark)); applyTheme(); });
$("#export-data").addEventListener("click", () => { const blob = new Blob([JSON.stringify({ courses: state.courses, assignments: state.assignments }, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `ledger-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); });
$("#import-data").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(reader.result); if (!Array.isArray(imported.courses) || !Array.isArray(imported.assignments)) throw new Error("Invalid Ledger backup."); state.courses = imported.courses; state.assignments = imported.assignments; save(); render(); alert("Ledger data imported successfully."); } catch (error) { alert(`Import failed: ${error.message}`); } event.target.value = ""; }; reader.readAsText(file); });
function showConfetti() { const colors = ["#7562c7", "#f4c95d", "#d85b68", "#3b9b79"]; for (let index = 0; index < 18; index += 1) { const piece = document.createElement("i"); piece.className = "confetti-piece"; piece.style.left = `${window.innerWidth / 2 + (Math.random() - .5) * 160}px`; piece.style.top = `${window.innerHeight / 2}px`; piece.style.background = colors[index % colors.length]; piece.style.setProperty("--x", `${(Math.random() - .5) * 260}px`); piece.style.setProperty("--y", `${80 + Math.random() * 180}px`); piece.style.transform = `rotate(${Math.random() * 180}deg)`; document.body.appendChild(piece); setTimeout(() => piece.remove(), 800); } }
applyTheme();
render();
