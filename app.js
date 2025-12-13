import { supabase } from "./supabase.js";
import { generateSchedule } from "./logic/scheduler.js";

const personName = document.getElementById("personName");
const peopleList = document.getElementById("peopleList");
const generate = document.getElementById("generate");

let people = [];

/* ================= AUTH ================= */

window.register = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert(error.message);
};

window.login = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert(error.message);
};

window.logout = async () => {
  await supabase.auth.signOut();
};

supabase.auth.onAuthStateChange((_e, session) => {
  userInfo.textContent = session
    ? "Giriş yapan: " + session.user.email
    : "Giriş yapılmadı";
  if (session) loadPeople();
});

/* ================= PEOPLE ================= */

window.addPerson = async () => {
  const name = personName.value.trim();
  if (!name) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Giriş yap");

  await supabase.from("people").insert({
    name,
    user_id: user.id
  });

  personName.value = "";
  loadPeople();
};

async function loadPeople() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", user.id);

  people = data || [];
  renderPeople();
}

function renderPeople() {
  peopleList.innerHTML = "";
  people.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.name;
    peopleList.appendChild(li);
  });
}

/* ================= GENERATE ================= */

generate.onclick = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Giriş yap");

  const schedule = generateSchedule(people);

  const { data: sched } = await supabase
    .from("schedules")
    .insert({ user_id: user.id })
    .select()
    .single();

  const rows = schedule.map(s => ({
    schedule_id: sched.id,
    person_id: s.personId,
    department_id: s.departmentId
  }));

  await supabase.from("assignments").insert(rows);

  alert("Takvim oluşturuldu");
};