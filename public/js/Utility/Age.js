const ageElement = document.getElementById("age");
ageElement.textContent = Age();

function Age() {
  let bdayMs = new Date("2008-05-03").getTime();
  let currentMs = new Date().getTime();
  let difference = currentMs - bdayMs;
  return Math.floor(difference / (1000 * 3600 * 24 * 365.25));
}
