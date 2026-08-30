import "./style.css";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "./firebase.js";

const app = document.getElementById("app");

let currentUser = null;
let currentProfile = null;
let unsubscribeChats = null;
let unsubscribeMessages = null;

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avatar(name = "س") {
  return `<div class="avatar">${esc(name.trim().charAt(0) || "س")}</div>`;
}

function errorText(error) {
  const code = error?.code || "";

  const messages = {
    "auth/email-already-in-use": "البريد الإلكتروني مستخدم بالفعل.",
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/weak-password": "كلمة المرور ضعيفة. استخدم 8 أحرف أو أكثر.",
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/user-not-found": "الحساب غير موجود.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/too-many-requests": "محاولات كثيرة. حاول لاحقًا.",
    "auth/network-request-failed": "تحقق من اتصال الإنترنت."
  };

  return messages[code] || "حدث خطأ. حاول مرة أخرى.";
}

function authPage(mode = "login", message = "") {
  const login = mode === "login";

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="logo">سوداني</div>
        <div class="subtitle">منصة سودانية للتواصل والمراسلة</div>

        <div class="tabs">
          <button id="loginTab" class="${login ? "active" : ""}">
            تسجيل الدخول
          </button>
          <button id="registerTab" class="${!login ? "active" : ""}">
            إنشاء حساب
          </button>
        </div>

        ${
          login
            ? `
              <form id="loginForm">
                <div class="field">
                  <label>البريد الإلكتروني</label>
                  <input id="loginEmail" type="email" required
                    placeholder="example@email.com">
                </div>

                <div class="field">
                  <label>كلمة المرور</label>
                  <input id="loginPassword" type="password" required
                    placeholder="كلمة المرور">
                </div>

                <button class="primary" type="submit">
                  تسجيل الدخول
                </button>

                <button class="forgot" id="forgotPassword"
                  type="button">
                  نسيت كلمة المرور؟
                </button>

                <div id="authMessage"></div>
              </form>
            `
            : `
              <form id="registerForm">
                <div class="field">
                  <label>الاسم الحقيقي</label>
                  <input id="regName" required
                    placeholder="اكتب اسمك الحقيقي">
                </div>

                <div class="field">
                  <label>اسم المستخدم</label>
                  <input id="regUsername" required
                    placeholder="@username">
                </div>

                <div class="field">
                  <label>رقم الهاتف</label>
                  <input id="regPhone"
                    placeholder="+249xxxxxxxxx">
                </div>

                <div class="field">
                  <label>تاريخ الميلاد</label>
                  <input id="regBirthDate" type="date" required>
                </div>

                <div class="field">
                  <label>الجنس</label>
                  <select id="regGender" required>
                    <option value="">اختر</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                <div class="field">
                  <label>البريد الإلكتروني</label>
                  <input id="regEmail" type="email" required
                    placeholder="example@email.com">
                </div>

                <div class="field">
                  <label>كلمة المرور</label>
                  <input id="regPassword" type="password" required
                    minlength="8"
                    placeholder="8 أحرف أو أكثر">
                </div>

                <div class="field">
                  <label>تأكيد كلمة المرور</label>
                  <input id="regPassword2" type="password" required
                    minlength="8"
                    placeholder="أعد كتابة كلمة المرور">
                </div>

                <button class="primary" type="submit">
                  إنشاء الحساب
                </button>

                <div id="authMessage"></div>
              </form>
            `
        }

        <div class="footer-note">
          بيانات الحساب تتم إدارتها بواسطة Firebase Authentication.
        </div>
      </div>
    </div>
  `;

  document.getElementById("loginTab").onclick = () => authPage("login");
  document.getElementById("registerTab").onclick = () => authPage("register");

  if (message) {
    showMessage(message, "error");
  }

  if (login) setupLogin();
  else setupRegister();
}

function showMessage(text, type = "error") {
  const box = document.getElementById("authMessage");
  if (!box) return;

  box.className = `message ${type}`;
  box.textContent = text;
}

function setupLogin() {
  const form = document.getElementById("loginForm");

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "جاري الدخول...";

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      showMessage(errorText(error));
      button.disabled = false;
      button.textContent = "تسجيل الدخول";
    }
  });

  document.getElementById("forgotPassword").onclick =
    async () => {
      const email =
        document.getElementById("loginEmail").value.trim();

      if (!email) {
        showMessage("اكتب بريدك الإلكتروني أولًا.");
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);
        showMessage(
          "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.",
          "success"
        );
      } catch (error) {
        showMessage(errorText(error));
      }
    };
}

function setupRegister() {
  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const name =
      document.getElementById("regName").value.trim();

    const username =
      document.getElementById("regUsername").value
        .trim()
        .replace(/^@/, "")
        .toLowerCase();

    const phone =
      document.getElementById("regPhone").value.trim();

    const birthDate =
      document.getElementById("regBirthDate").value;

    const gender =
      document.getElementById("regGender").value;

    const email =
      document.getElementById("regEmail").value.trim();

    const password =
      document.getElementById("regPassword").value;

    const password2 =
      document.getElementById("regPassword2").value;

    if (name.length < 2) {
      showMessage("اكتب الاسم الحقيقي.");
      return;
    }

    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
      showMessage(
        "اسم المستخدم يجب أن يحتوي على حروف أو أرقام أو _ أو ."
      );
      return;
    }

    if (password.length < 8) {
      showMessage("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== password2) {
      showMessage("كلمتا المرور غير متطابقتين.");
      return;
    }

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "جاري إنشاء الحساب...";

    try {
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", username),
        limit(1)
      );

      const usernameResult = await getDocs(usernameQuery);

      if (!usernameResult.empty) {
        showMessage("اسم المستخدم مستخدم بالفعل.");
        button.disabled = false;
        button.textContent = "إنشاء الحساب";
        return;
      }

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await updateProfile(credential.user, {
        displayName: name
      });

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          uid: credential.user.uid,
          name,
          username,
          phone,
          birthDate,
          gender,
          email,
          photoURL: "",
          bio: "",
          online: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

    } catch (error) {
      console.error("REGISTER FIREBASE ERROR:", error);
      showMessage(
        `${errorText(error)} | ${error?.code || "unknown"}`
      );
      button.disabled = false;
      button.textContent = "إنشاء الحساب";
    }
  });
}

async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    currentProfile = snap.data();
  } else {
    currentProfile = {
      uid: user.uid,
      name: user.displayName || "مستخدم",
      username: "",
      email: user.email || ""
    };
  }
}

function layout() {
  app.innerHTML = `
    <div class="app">

      <aside class="sidebar">
        <div class="sidebar-logo">سوداني</div>

        <nav class="nav">
          <button data-page="home">🏠 الرئيسية</button>
          <button data-page="search">🔎 البحث</button>
          <button data-page="chats">💬 المحادثات</button>
          <button data-page="status">⭕ الحالات</button>
          <button data-page="profile">👤 الملف الشخصي</button>
          <button data-page="settings">⚙️ الإعدادات</button>
          <button id="logoutButton">🚪 تسجيل الخروج</button>
        </nav>
      </aside>

      <main class="main">

        <header class="topbar">
          <strong>سوداني</strong>
          <input
            id="globalSearch"
            class="search"
            placeholder="بحث عن أشخاص..."
          >
        </header>

        <section id="content" class="content"></section>

        <nav class="bottom-nav">
          <button data-page="home">🏠<br>الرئيسية</button>
          <button data-page="search">🔎<br>بحث</button>
          <button data-page="chats">💬<br>محادثات</button>
          <button data-page="status">⭕<br>حالات</button>
          <button data-page="profile">👤<br>حسابي</button>
        </nav>

      </main>
    </div>
  `;

  document.querySelectorAll("[data-page]").forEach(button => {
    button.onclick = () => openPage(button.dataset.page);
  });

  document.getElementById("logoutButton").onclick =
    async () => {
      await signOut(auth);
    };

  document.getElementById("globalSearch").addEventListener(
    "keydown",
    e => {
      if (e.key === "Enter") {
        openPage("search", e.target.value.trim());
      }
    }
  );
}

async function openPage(page, value = "") {
  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const content = document.getElementById("content");

  if (page === "home") {
    renderHome();
  }

  if (page === "search") {
    renderSearch(value);
  }

  if (page === "chats") {
    renderChats();
  }

  if (page === "status") {
    renderStatus();
  }

  if (page === "profile") {
    renderProfile();
  }

  if (page === "settings") {
    renderSettings();
  }

  content.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderHome() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      <div class="profile-head">
        ${avatar(currentProfile?.name)}
        <div>
          <strong>أهلاً ${esc(currentProfile?.name || "")} 👋</strong>
          <div class="subtitle" style="margin:4px 0 0">
            مرحبًا بك في سوداني
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>آخر المنشورات</h3>
      <div id="posts">
        جاري تحميل المنشورات...
      </div>
    </div>
  `;

  loadPosts();
}

async function loadPosts() {
  const box = document.getElementById("posts");
  if (!box) return;

  try {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const result = await getDocs(q);

    if (result.empty) {
      box.innerHTML =
        `<p class="subtitle">لا توجد منشورات حتى الآن.</p>`;
      return;
    }

    box.innerHTML = result.docs.map(item => {
      const post = item.data();

      return `
        <article class="post">
          <div class="profile-head">
            ${avatar(post.authorName || "س")}
            <div>
              <strong>${esc(post.authorName || "مستخدم")}</strong>
              <div class="subtitle">
                @${esc(post.authorUsername || "")}
              </div>
            </div>
          </div>

          <p>${esc(post.text || "")}</p>

          <div class="post-actions">
            <button>❤️ إعجاب</button>
            <button>💬 تعليق</button>
            <button>↗ مشاركة</button>
          </div>
        </article>
      `;
    }).join("");

  } catch (error) {
    box.innerHTML =
      `<div class="message error">
        تعذر تحميل المنشورات.
      </div>`;
  }
}

async function renderSearch(initial = "") {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      <h2>🔎 البحث</h2>

      <div class="field">
        <input id="searchInput"
          value="${esc(initial)}"
          placeholder="ابحث بالاسم أو اسم المستخدم">
      </div>

      <button class="primary" id="searchButton">
        بحث
      </button>
    </div>

    <div id="searchResults"></div>
  `;

  const input = document.getElementById("searchInput");

  document.getElementById("searchButton").onclick =
    () => searchUsers(input.value.trim());

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      searchUsers(input.value.trim());
    }
  });

  if (initial) {
    searchUsers(initial);
  }
}

async function searchUsers(value) {
  const box = document.getElementById("searchResults");

  if (!box || value.length < 2) {
    if (box) {
      box.innerHTML =
        `<div class="card">اكتب حرفين على الأقل.</div>`;
    }
    return;
  }

  box.innerHTML =
    `<div class="card">جاري البحث...</div>`;

  try {
    const q = query(
      collection(db, "users"),
      where("username", ">=", value.toLowerCase()),
      where("username", "<=", value.toLowerCase() + "\uf8ff"),
      limit(20)
    );

    const result = await getDocs(q);

    if (result.empty) {
      box.innerHTML =
        `<div class="card">لم يتم العثور على مستخدمين.</div>`;
      return;
    }

    box.innerHTML = result.docs.map(item => {
      const user = item.data();

      return `
        <div class="card">
          <div class="profile-head">
            ${avatar(user.name)}
            <div style="flex:1">
              <strong>${esc(user.name)}</strong>
              <div class="subtitle">@${esc(user.username)}</div>
            </div>

            <button class="primary"
              style="width:auto;padding:9px 14px"
              data-chat-user="${esc(user.uid)}">
              مراسلة
            </button>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll("[data-chat-user]").forEach(btn => {
      btn.onclick = () => startChat(btn.dataset.chatUser);
    });

  } catch (error) {
    box.innerHTML =
      `<div class="card">
        تعذر تنفيذ البحث.
      </div>`;
  }
}

async function startChat(otherUid) {
  const members = [currentUser.uid, otherUid].sort();

  const chatId = members.join("_");

  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    await setDoc(chatRef, {
      members,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: ""
    });
  }

  await renderChat(chatId);
}

function renderChats() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      <h2>💬 المحادثات</h2>
      <div id="chatList" class="chat-list">
        جاري تحميل المحادثات...
      </div>
    </div>
  `;

  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", currentUser.uid)
  );

  if (unsubscribeChats) unsubscribeChats();

  unsubscribeChats = onSnapshot(q, async snapshot => {
    const box = document.getElementById("chatList");
    if (!box) return;

    if (snapshot.empty) {
      box.innerHTML =
        `<p class="subtitle">لا توجد محادثات حتى الآن.</p>`;
      return;
    }

    const chats = [];

    for (const item of snapshot.docs) {
      const chat = item.data();

      const other =
        chat.members.find(id => id !== currentUser.uid);

      let profile = null;

      if (other) {
        const profileSnap =
          await getDoc(doc(db, "users", other));

        if (profileSnap.exists()) {
          profile = profileSnap.data();
        }
      }

      chats.push({
        id: item.id,
        profile
      });
    }

    box.innerHTML = chats.map(chat => `
      <button class="chat-item"
        data-open-chat="${esc(chat.id)}">
        ${avatar(chat.profile?.name)}
        <div>
          <strong>${esc(chat.profile?.name || "مستخدم")}</strong>
          <div class="subtitle">
            @${esc(chat.profile?.username || "")}
          </div>
        </div>
      </button>
    `).join("");

    document.querySelectorAll("[data-open-chat]").forEach(btn => {
      btn.onclick = () => renderChat(btn.dataset.openChat);
    });
  });
}

async function renderChat(chatId) {
  const content = document.getElementById("content");

  const chatSnap =
    await getDoc(doc(db, "chats", chatId));

  if (!chatSnap.exists()) return;

  const chat = chatSnap.data();

  const otherUid =
    chat.members.find(id => id !== currentUser.uid);

  const otherSnap =
    await getDoc(doc(db, "users", otherUid));

  const other =
    otherSnap.exists() ? otherSnap.data() : {};

  content.innerHTML = `
    <div class="chat-window">

      <div class="chat-header">
        ${avatar(other.name)}
        <div>
          <strong>${esc(other.name || "مستخدم")}</strong>
          <div class="subtitle">@${esc(other.username || "")}</div>
        </div>
      </div>

      <div id="messages" class="messages">
        جاري تحميل الرسائل...
      </div>

      <form id="messageForm" class="composer">
        <input id="messageInput"
          autocomplete="off"
          placeholder="اكتب رسالة...">
        <button class="primary"
          style="width:auto;padding:10px 18px">
          إرسال
        </button>
      </form>

    </div>
  `;

  if (unsubscribeMessages) unsubscribeMessages();

  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    snapshot => {
      const box = document.getElementById("messages");
      if (!box) return;

      if (snapshot.empty) {
        box.innerHTML =
          `<p class="subtitle">ابدأ المحادثة 👋</p>`;
        return;
      }

      box.innerHTML = snapshot.docs.map(item => {
        const msg = item.data();
        const mine =
          msg.senderId === currentUser.uid;

        return `
          <div class="bubble ${mine ? "mine" : "other"}">
            ${esc(msg.content || "")}
          </div>
        `;
      }).join("");

      box.scrollTop = box.scrollHeight;
    },
    () => {
      const box = document.getElementById("messages");
      if (box) {
        box.innerHTML =
          `<div class="message error">
            تعذر تحميل الرسائل.
          </div>`;
      }
    }
  );

  document.getElementById("messageForm").onsubmit =
    async e => {
      e.preventDefault();

      const input =
        document.getElementById("messageInput");

      const text = input.value.trim();

      if (!text) return;

      input.disabled = true;

      try {
        await addDoc(
          collection(db, "chats", chatId, "messages"),
          {
            senderId: currentUser.uid,
            content: text,
            type: "text",
            createdAt: serverTimestamp()
          }
        );

        await setDoc(
          doc(db, "chats", chatId),
          {
            lastMessage: text,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        input.value = "";
      } catch (error) {
        alert("تعذر إرسال الرسالة.");
      }

      input.disabled = false;
      input.focus();
    };
}

function renderStatus() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      <h2>⭕ الحالات</h2>
      <p class="subtitle">
        حالات سوداني ستعمل بنظام الحالات المؤقتة.
      </p>

      <div class="field">
        <textarea id="statusText"
          rows="4"
          placeholder="اكتب حالتك..."></textarea>
      </div>

      <button class="primary" id="publishStatus">
        نشر الحالة
      </button>

      <div id="statusList" style="margin-top:20px">
        جاري تحميل الحالات...
      </div>
    </div>
  `;

  document.getElementById("publishStatus").onclick =
    createStatus;

  loadStatuses();
}

async function createStatus() {
  const input =
    document.getElementById("statusText");

  const text = input.value.trim();

  if (!text) {
    alert("اكتب الحالة أولًا.");
    return;
  }

  await addDoc(collection(db, "statuses"), {
    userId: currentUser.uid,
    userName: currentProfile.name,
    text,
    createdAt: serverTimestamp()
  });

  input.value = "";

  loadStatuses();
}

async function loadStatuses() {
  const box = document.getElementById("statusList");
  if (!box) return;

  try {
    const q = query(
      collection(db, "statuses"),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const result = await getDocs(q);

    if (result.empty) {
      box.innerHTML =
        `<p class="subtitle">لا توجد حالات.</p>`;
      return;
    }

    box.innerHTML = result.docs.map(item => {
      const status = item.data();

      return `
        <div class="card">
          <div class="profile-head">
            ${avatar(status.userName)}
            <strong>${esc(status.userName)}</strong>
          </div>

          <p>${esc(status.text)}</p>
        </div>
      `;
    }).join("");

  } catch {
    box.innerHTML =
      `<p class="subtitle">تعذر تحميل الحالات.</p>`;
  }
}

function renderProfile() {
  const p = currentProfile || {};

  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      <div class="profile-head">
        ${avatar(p.name)}

        <div>
          <h2 style="margin:0">${esc(p.name || "")}</h2>
          <div class="subtitle">@${esc(p.username || "")}</div>
        </div>
      </div>

      <hr>

      <p><strong>الاسم:</strong> ${esc(p.name || "—")}</p>
      <p><strong>اسم المستخدم:</strong> @${esc(p.username || "—")}</p>
      <p><strong>البريد:</strong> ${esc(p.email || "—")}</p>
      <p><strong>الهاتف:</strong> ${esc(p.phone || "—")}</p>
      <p><strong>تاريخ الميلاد:</strong> ${esc(p.birthDate || "—")}</p>
      <p><strong>الجنس:</strong> ${esc(p.gender || "—")}</p>
      <p><strong>النبذة:</strong> ${esc(p.bio || "—")}</p>
    </div>
  `;
}

function renderSettings() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="card">
      <h2>⚙️ الإعدادات</h2>

      <button class="chat-item">
        🔐 الخصوصية والأمان
      </button>

      <button class="chat-item">
        🔔 الإشعارات
      </button>

      <button class="chat-item">
        🌐 اللغة
      </button>

      <button class="chat-item">
        ℹ️ حول سوداني
      </button>

      <button id="settingsLogout"
        class="primary"
        style="margin-top:15px">
        تسجيل الخروج
      </button>
    </div>
  `;

  document.getElementById("settingsLogout").onclick =
    () => signOut(auth);
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUser = null;
    currentProfile = null;

    if (unsubscribeChats) unsubscribeChats();
    if (unsubscribeMessages) unsubscribeMessages();

    authPage("login");
    return;
  }

  currentUser = user;

  try {
    await loadProfile(user);
    layout();
    openPage("home");
  } catch (error) {
    console.error(error);

    app.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="logo">سوداني</div>
          <p>
            حدث خطأ أثناء تحميل حسابك.
          </p>
          <button class="primary" id="retry">
            إعادة المحاولة
          </button>
        </div>
      </div>
    `;

    document.getElementById("retry").onclick =
      () => location.reload();
  }
});
