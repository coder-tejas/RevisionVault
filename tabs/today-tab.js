// tabs/today-tab.js - Today's due items + Todos
window.RV = window.RV || {};

window.RV.todayTab = {
  async render(userId) {
    const container = document.getElementById("dueList");
    container.innerHTML = `<div class="empty-state"><div class="ei">⏳</div><p>Loading…</p></div>`;
    try {
      const today = window.RV.utils.todayStr();
      const all = await window.RV.api.getItemsDueToday(userId);
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      container.innerHTML = "";

      // ── REVISION SECTION ──
      if (all.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="ei">🎯</div><p>Nothing due today.<br/>Go build something!</p></div>`;
        document.getElementById("dueBadge").textContent = "";
      } else {
        let pending = 0;
        all.forEach(item => {
          const idx = item.nextReviewDates.indexOf(today);
          const isDone = (item.completedIntervals || []).includes(idx);
          if (!isDone) pending++;
          const isMem = item._type === "mem";
          const card = document.createElement("div");
          card.className = `${isMem ? "mem-card" : "due-card"}${isDone ? " done" : ""}`;
          if (isMem) {
            const isLong = item.content.length > 160;
            card.innerHTML = `
              <div class="dc-top">${window.RV.utils.catBadge(item.category)}<span class="type-tag type-mem">📝 note</span></div>
              <div class="mem-content${isLong ? "" : " expanded"}" id="mc-${item._id}">${window.RV.utils.esc(item.content)}</div>
              ${isLong ? `<button class="mem-expand" data-id="${item._id}">▼ Show more</button>` : ""}
              <div class="dc-meta">
                <span class="dc-interval">Review <strong>+${window.RV.CONSTANTS.INTERVALS[idx]}d</strong> from ${window.RV.utils.fmtShort(item.savedDate)}</span>
                <button class="done-btn" data-id="${item._id}" data-idx="${idx}" data-type="mem">${isDone ? "✓ Done" : "Mark Done"}</button>
              </div>`;
            const exp = card.querySelector(".mem-expand");
            if (exp) exp.addEventListener("click", () => {
              const mc = document.getElementById(`mc-${item._id}`);
              mc.classList.toggle("expanded");
              exp.textContent = mc.classList.contains("expanded") ? "▲ Less" : "▼ Show more";
            });
          } else {
            card.innerHTML = `
              <div class="dc-top">${window.RV.utils.catBadge(item.category)}<span class="type-tag type-url">🔗</span><a class="dc-url" href="${window.RV.utils.esc(item.url)}" target="_blank">${window.RV.utils.shortUrl(item.url, 28)}</a></div>
              ${item.note ? `<div class="dc-note">"${window.RV.utils.esc(item.note)}"</div>` : ""}
              <div class="dc-meta">
                <span class="dc-interval">Review <strong>+${window.RV.CONSTANTS.INTERVALS[idx]}d</strong> from ${window.RV.utils.fmtShort(item.savedDate)}</span>
                <button class="done-btn" data-id="${item._id}" data-idx="${idx}" data-type="url">${isDone ? "✓ Done" : "Mark Done"}</button>
              </div>`;
          }
          card.querySelector(".done-btn").addEventListener("click", async e => {
            await window.RV.api.markComplete(e.target.dataset.id, parseInt(e.target.dataset.idx), e.target.dataset.type);
            this.render(userId);
          });
          container.appendChild(card);
        });
        document.getElementById("dueBadge").textContent = pending > 0 ? String(pending) : "";
        window.RV.badgeService.updateBadge();
      }

      // ── TODO SECTION ──
      await this.renderTodos(userId, today, container);

    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="ei">❌</div><p>Server offline.<br/><code>node index.js</code></p></div>`;
    }
  },

  async renderTodos(userId, date, container) {
    // Section header
    const divider = document.createElement("div");
    divider.className = "todo-section-header";
    divider.innerHTML = `<span class="todo-section-title">✅ Tasks</span>`;
    container.appendChild(divider);

    // Add-todo row
    const addRow = document.createElement("div");
    addRow.className = "todo-add-row";
    addRow.innerHTML = `
      <input class="todo-input" id="todoInput" type="text" placeholder="Add a task…" maxlength="120"/>
      <select class="todo-date-select" id="todoDateSelect">
        <option value="${date}">Today</option>
        <option value="${this._offsetDate(date, 1)}">Tomorrow</option>
        <option value="${this._offsetDate(date, 2)}">${this._labelDate(date, 2)}</option>
        <option value="${this._offsetDate(date, 3)}">${this._labelDate(date, 3)}</option>
        <option value="${this._offsetDate(date, 7)}">In 7 days</option>
        <option value="custom">Custom date…</option>
      </select>
      <button class="todo-add-btn" id="todoAddBtn">＋</button>`;
    container.appendChild(addRow);

    // Custom date input (hidden by default)
    const customRow = document.createElement("div");
    customRow.className = "todo-custom-row hidden";
    customRow.id = "todoCustomRow";
    customRow.innerHTML = `<input class="todo-date-input" id="todoCustomDate" type="date" min="${date}"/>`;
    container.appendChild(customRow);

    // Todo list container
    const todoList = document.createElement("div");
    todoList.className = "todo-list";
    todoList.id = "todoList";
    container.appendChild(todoList);

    // Wire up select toggle for custom
    const sel = addRow.querySelector("#todoDateSelect");
    sel.addEventListener("change", () => {
      customRow.classList.toggle("hidden", sel.value !== "custom");
    });

    // Wire up add button
    const doAdd = async () => {
      const input = document.getElementById("todoInput");
      const text = input.value.trim();
      if (!text) return;
      let dueDate = sel.value === "custom"
        ? (document.getElementById("todoCustomDate").value || date)
        : sel.value;
      try {
        await window.RV.api.createTodo(userId, text, dueDate);
        input.value = "";
        await this._loadTodos(userId, date, todoList);
      } catch {
        // silently fail — server offline
      }
    };
    addRow.querySelector("#todoAddBtn").addEventListener("click", doAdd);
    addRow.querySelector("#todoInput").addEventListener("keydown", e => {
      if (e.key === "Enter") doAdd();
    });

    await this._loadTodos(userId, date, todoList);
  },

  async _loadTodos(userId, date, todoList) {
    try {
      const todos = await window.RV.api.getTodos(userId, date);
      todoList.innerHTML = "";
      if (todos.length === 0) {
        todoList.innerHTML = `<div class="todo-empty">No tasks for today.</div>`;
        return;
      }
      todos.forEach(todo => {
        const el = document.createElement("div");
        el.className = `todo-item${todo.done ? " todo-done" : ""}`;
        el.innerHTML = `
          <button class="todo-check" data-id="${todo._id}" title="${todo.done ? "Mark undone" : "Mark done"}">
            ${todo.done ? "✓" : "○"}
          </button>
          <span class="todo-text">${window.RV.utils.esc(todo.text)}</span>
          <button class="todo-del" data-id="${todo._id}" title="Delete">✕</button>`;
        el.querySelector(".todo-check").addEventListener("click", async e => {
          await window.RV.api.toggleTodo(e.target.dataset.id);
          await this._loadTodos(userId, date, todoList);
        });
        el.querySelector(".todo-del").addEventListener("click", async e => {
          await window.RV.api.deleteTodo(e.target.dataset.id);
          await this._loadTodos(userId, date, todoList);
        });
        todoList.appendChild(el);
      });
    } catch {
      todoList.innerHTML = `<div class="todo-empty">Could not load tasks.</div>`;
    }
  },

  _offsetDate(base, days) {
    const d = new Date(base + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  },

  _labelDate(base, days) {
    const d = new Date(base + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  },

  async renderWithRating(userId) {
    const todayHdr = document.querySelector(".today-hdr");
    if (!todayHdr) return;
    
    const existingWidget = document.getElementById("ratingWidget");
    if (existingWidget) existingWidget.remove();
    
    const today = window.RV.utils.todayStr();
    const month = today.slice(0, 7);
    const ratings = await window.RV.api.getRatings(userId, month);
    const currentRating = ratings[today] || 0;
    const starsHtml = [1,2,3,4,5].map(n => {
      const active = n <= currentRating ? " active" : "";
      return `<button class="star-btn${active}" data-rating="${n}">★</button>`;
    }).join("");
    const ratingWidget = document.createElement("div");
    ratingWidget.className = "rating-widget";
    ratingWidget.id = "ratingWidget";
    ratingWidget.innerHTML = `<div class="rating-label">Rate today:</div><div class="star-row">${starsHtml}</div>`;
    todayHdr.parentNode.insertBefore(ratingWidget, todayHdr);
    ratingWidget.querySelectorAll(".star-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        const rating = parseInt(e.target.dataset.rating);
        await window.RV.api.saveRating(userId, today, rating);
        this.renderWithRating(userId);
        if (window.RV.calendarTab?.loadRatings) {
          await window.RV.calendarTab.loadRatings();
          window.RV.calendarTab.render();
        }
      });
    });
    await this.render(userId);
  }
};