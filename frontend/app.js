const API_URL = "http://localhost:3000";
let token = localStorage.getItem("token") || null;
let userRole = localStorage.getItem("role") || null;

// ----------------- LOGIN -----------------
async function login() {
  const aadhar = document.getElementById("loginAadhar").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!aadhar || !password) {
    document.getElementById("loginMsg").innerText = "Please fill all fields!";
    return;
  }

  const res = await fetch(`${API_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aadharCardNumber: aadhar, password })
  });

  const data = await res.json();
  if (res.ok) {
    token = data.token;
    localStorage.setItem("token", token);
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("loginMsg").innerText = data.error || "Login failed";
  }
}

// ----------------- SIGNUP -----------------
async function signup() {
  const age = parseInt(document.getElementById("signupAge").value.trim(), 10);

  if (age < 18) {
    document.getElementById("signupMsg").innerText = "You must be 18 or older to register!";
    return;
  }

  const user = {
    name: document.getElementById("signupName").value.trim(),
    age: document.getElementById("signupAge").value.trim(),
    email: document.getElementById("signupEmail").value.trim(),
    mobile: document.getElementById("signupMobile").value.trim(),
    address: document.getElementById("signupAddress").value.trim(),
    aadharCardNumber: document.getElementById("signupAadhar").value.trim(),
    password: document.getElementById("signupPassword").value.trim(),
    role: document.getElementById("signupRole").value
  };

  if (!user.name || !user.age || !user.email || !user.address || !user.aadharCardNumber || !user.password) {
    document.getElementById("signupMsg").innerText = "Please fill all required fields!";
    return;
  }

  const res = await fetch(`${API_URL}/user/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });

  const data = await res.json();
  if (res.ok) {
    token = data.token;
    localStorage.setItem("token", token);
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("signupMsg").innerText = data.error || "Signup failed";
  }
}

// ----------------- LOAD PROFILE -----------------
async function loadProfile() {
  try {
    const res = await fetch(`${API_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to fetch profile");

    const user = data.user;

    // Fill profile section
    const profileElements = ["Name", "Email", "Age", "Role"];
    profileElements.forEach(el => {
      const span = document.getElementById(`profile${el}`);
      if (span) span.innerText = user[el.toLowerCase()] || "N/A";
    });

    // Show panels based on role
    if (user.role === "admin") {
      document.getElementById("adminPanel").style.display = "block";
      document.getElementById("adminElectionControls").style.display = "block"; // ✅ Show election controls
      loadAdminCandidates();
      loadElectionPhase(); 
      loadCurrentElection();
    } else {
      document.getElementById("votePanel").style.display = "block";
      loadElectionPhase(); 
      loadCandidates();
      loadResults();
      loadCurrentElection();
    }

  } catch (err) {
    console.error("Error fetching profile:", err);
    alert("Failed to load profile. Logging out.");
    logout();
  }
}


// ----------------- DASHBOARD PAGE LOAD -----------------
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("dashboard.html")) {
    if (!token) window.location.href = "index.html";
    else loadProfile();
  }
});

// ----------------- VOTER FUNCTIONS -----------------
async function loadCandidates() {
  const res = await fetch(`${API_URL}/candidate/candidates`);
  const data = await res.json();
  const container = document.getElementById("candidates");
  container.innerHTML = "";
  if (!data.candidates) return;

  data.candidates.forEach(c => {
    const div = document.createElement("div");
    div.className = "candidate";
    div.innerHTML = `
      <span>${c.name || "N/A"} (${c.party || "N/A"}) - Votes: ${c.voteCount || 0}</span>
      <button onclick="vote('${c._id}')">Vote</button>
      <button onclick='openCandidateModal(${JSON.stringify(c)})'>View Profile</button>
    `;
    container.appendChild(div);
  });
}

async function vote(id) {
  if (!id) return alert("Invalid candidate ID");

  const res = await fetch(`${API_URL}/candidate/votes/${id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  alert(data.message || "Vote recorded");
  loadCandidates();
}

// ----------------- RESULTS (Chart.js) -----------------
async function loadResults() {
  const res = await fetch(`${API_URL}/candidate/vote/count`);
  const data = await res.json();
  const container = document.getElementById("results");
  container.innerHTML = "";

  if (!data.voteRecord || data.voteRecord.length === 0) {
    container.innerHTML = "<p>No votes yet!</p>";
    if (window.resultsChart && typeof window.resultsChart.destroy === "function") {
      window.resultsChart.destroy();
      window.resultsChart = null;
    }
    return;
  }

  const scrollDiv = document.createElement("div");
  scrollDiv.style.maxHeight = "200px";
  scrollDiv.style.overflowY = "auto";
  data.voteRecord.forEach(r => {
    const p = document.createElement("p");
    p.innerText = `${r.name || "N/A"} (${r.party || "N/A"}) → ${r.votes || 0} votes`;
    scrollDiv.appendChild(p);
  });
  container.appendChild(scrollDiv);

  const canvas = document.getElementById("resultsChart");
  if (window.resultsChart && typeof window.resultsChart.destroy === "function") {
    window.resultsChart.destroy();
    window.resultsChart = null;
  }

  canvas.height = Math.max(300, data.voteRecord.length * 50);
  const ctx = canvas.getContext("2d");
  window.resultsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.voteRecord.map(c => c.name),
      datasets: [{ label: "Votes", data: data.voteRecord.map(c => c.votes), backgroundColor: "#3498db" }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false }, title: { display: true, text: 'Voting Results' } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// ----------------- ADMIN FUNCTIONS -----------------
async function addCandidate() {
  const name = document.getElementById("cName").value.trim();
  const party = document.getElementById("cParty").value.trim();
  const age = document.getElementById("cAge").value.trim();
  const bio = document.getElementById("cBio") ? document.getElementById("cBio").value.trim() : "";
  const imageUrl = document.getElementById("cImage") ? document.getElementById("cImage").value.trim() : "";

  if (!name || !party || !age) {
    document.getElementById("adminMsg").innerText = "Please fill all fields!";
    return;
  }

  const res = await fetch(`${API_URL}/candidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, party, age, bio, imageUrl })
  });

  const data = await res.json();
  document.getElementById("adminMsg").innerText = res.ok ? "Candidate added!" : data.message || "Error";
  loadAdminCandidates();
}

async function loadAdminCandidates() {
  const res = await fetch(`${API_URL}/candidate/candidates`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();

  const container = document.getElementById("adminCandidates");
  container.innerHTML = "";
  if (!data.candidates) return;

  data.candidates.forEach(c => {
    const div = document.createElement("div");
    div.className = "candidate";
    div.innerHTML = `
      <span>${c.name || "N/A"} (${c.party || "N/A"}) - Age: ${c.age || "N/A"}</span>
      <button onclick="updateCandidate('${c._id}')">Update</button>
      <button onclick="deleteCandidate('${c._id}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

async function updateCandidate(id) {
  if (!id) return;
  const newName = prompt("Enter new name:").trim();
  const newParty = prompt("Enter new party:").trim();
  const newAge = prompt("Enter new age:").trim();
  const newBio = prompt("Enter new bio:").trim();
  const newImage = prompt("Enter new image URL:").trim();

  if (!newName || !newParty || !newAge) return alert("All fields are required!");

  await fetch(`${API_URL}/candidate/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: newName, party: newParty, age: newAge, bio: newBio, imageUrl: newImage })
  });
  loadAdminCandidates();
}

async function deleteCandidate(id) {
  if (!id) return;
  await fetch(`${API_URL}/candidate/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  loadAdminCandidates();
}

// ----------------- CANDIDATE MODAL -----------------
function openCandidateModal(c) {
  document.getElementById("modalName").innerText = c.name;
  document.getElementById("modalParty").innerText = c.party;
  document.getElementById("modalAge").innerText = c.age;
  document.getElementById("modalBio").innerText = c.bio || "No bio provided.";
  document.getElementById("modalImage").src = c.imageUrl || "default.png";
  document.getElementById("candidateModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("candidateModal").style.display = "none";
}

// ----------------- ELECTION PHASE (simple) -----------------
async function loadElectionPhase() {
  try {
    const res = await fetch(`${API_URL}/election/phase`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to fetch election phase");

    const phaseEl = document.getElementById("electionPhase");
    if (phaseEl) phaseEl.innerText = data.phase || "Not declared";

    if (data.phase !== "Voting") {
      const voteButtons = document.querySelectorAll("#candidates button:first-child");
      voteButtons.forEach(btn => { btn.disabled = true; btn.innerText = "Voting Disabled"; });
    }
  } catch (err) {
    console.error("Error loading election phase:", err);
  }
}

async function updateElectionPhase(newPhase) {
  try {
    const res = await fetch(`${API_URL}/election/phase`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phase: newPhase })
    });
    const data = await res.json();
    alert(data.message || "Election phase updated");
    loadElectionPhase();
  } catch (err) {
    console.error("Error updating phase:", err);
  }
}

// ----------------- NEW: FULL ELECTION MANAGEMENT -----------------
async function loadCurrentElection() {
  try {
    const res = await fetch(`${API_URL}/election/current`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to fetch current election");

    if (!data.election) {
      document.getElementById("electionName").innerText = "—";
      document.getElementById("electionStatus").innerText = "No active election";
      document.getElementById("electionStart").innerText = "—";
      document.getElementById("electionEnd").innerText = "—";

      // clear stored id
      window.currentElectionId = null;

      // disable buttons when no election
      const btnStart = document.getElementById("btnStart");
      const btnClose = document.getElementById("btnClose");
     

      if (btnStart) btnStart.disabled = true;
      if (btnClose) btnClose.disabled = true;
      

      return;
    }

    const e = data.election;

    // Fill UI fields
    document.getElementById("electionName").innerText = e.name;
    document.getElementById("electionStatus").innerText = e.status;
    document.getElementById("electionStart").innerText = new Date(e.startAt).toLocaleString();
    document.getElementById("electionEnd").innerText = new Date(e.endAt).toLocaleString();

    // store id globally so buttons can use it
    window.currentElectionId = e._id;

    // enable buttons now that election exists
    const btnStart = document.getElementById("btnStart");
    const btnClose = document.getElementById("btnClose");
   

    if (btnStart) {
      btnStart.disabled = false;
      btnStart.onclick = () => startElection(window.currentElectionId);
    }

    if (btnClose) {
      btnClose.disabled = false;
      btnClose.onclick = () => closeElection(window.currentElectionId);
    }

  
  } catch (err) {
    console.error("Error loading current election:", err);
  }
}


async function createElection() {
  const name = document.getElementById("eName").value.trim();
  const startAt = document.getElementById("eStart").value;
  const endAt = document.getElementById("eEnd").value;

  if (!name || !startAt || !endAt) return alert("All fields required!");

  const res = await fetch(`${API_URL}/election`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, startAt, endAt })
  });

  const data = await res.json();

  if (!res.ok) return alert(data.error || "Failed to create election");

  alert(`Election "${data.election.name}" created successfully`);
  loadCurrentElection();
}

async function startElection(id) {
  if (!id) return alert("No election id!");
  const res = await fetch(`${API_URL}/election/${id}/start`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (!res.ok) return alert(data.error || "Failed to start election");

  alert("Election started successfully");
  loadCurrentElection();
}

async function closeElection(id) {
  if (!id) return alert("No election id!");
  const res = await fetch(`${API_URL}/election/${id}/close`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (!res.ok) return alert(data.error || "Failed to close election");

  alert("Election closed successfully");
  loadCurrentElection();
}





// ----------------- LOGOUT -----------------
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}
