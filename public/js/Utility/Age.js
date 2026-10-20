const ageElement = document.getElementById("age");

function getAge(dateOfBirth, today = new Date()) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPending = today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (birthdayPending) age -= 1;
  return age;
}

if (ageElement) ageElement.textContent = getAge("2008-05-03");
