export function generateSchedule(
  people,
  departments,
  history,
  startDate,
  totalDuration,
  durationType,
  rotation,
  rotationType
) {
  const result = [];
  let currentDate = new Date(startDate);

  const endDate = addTime(
    new Date(startDate),
    totalDuration,
    durationType
  );

  let localHistory = JSON.parse(JSON.stringify(history));

  while (currentDate < endDate) {

    const assignments = generateOneRound(
      people,
      departments,
      localHistory
    );

    assignments.forEach(a => {
      result.push({
        ...a,
        start: new Date(currentDate),
        end: addTime(
          new Date(currentDate),
          rotation,
          rotationType
        )
      });

      // geçmişe ekle
      localHistory[a.personId] =
        localHistory[a.personId] || [];
      localHistory[a.personId].push(a.departmentId);
    });

    currentDate = addTime(
      currentDate,
      rotation,
      rotationType
    );
  }

  return result;
}

// ---------- yardımcılar ----------

function generateOneRound(people, departments, history) {
  const totalCapacity = departments.reduce(
    (s, d) => s + d.capacity, 0
  );

  if (people.length > totalCapacity) {
    throw new Error("Kontenjan yetersiz");
  }

  const usage = {};
  departments.forEach(d => usage[d.id] = 0);

  const round = [];

  for (const person of people) {
    const worked = history[person.id] || [];

    let candidates = departments.filter(
      d =>
        !worked.includes(d.id) &&
        usage[d.id] < d.capacity
    );

    if (candidates.length === 0) {
      candidates = departments
        .filter(d => usage[d.id] < d.capacity)
        .sort((a, b) =>
          usage[a.id] - usage[b.id]
        );
    }

    const chosen = candidates[0];
    if (!chosen) throw new Error("Dağıtım yapılamadı");

    usage[chosen.id]++;
    round.push({
      personId: person.id,
      person: person.name,
      departmentId: chosen.id,
      department: chosen.name
    });
  }

  return round;
}

function addTime(date, amount, type) {
  const d = new Date(date);
  if (type === "day") d.setDate(d.getDate() + amount);
  if (type === "week") d.setDate(d.getDate() + amount * 7);
  if (type === "month") d.setMonth(d.getMonth() + amount);
  return d;
}