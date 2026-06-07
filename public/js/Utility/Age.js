// ==========================================
// 🎂 Age Calculator
// Dynamically calculates your current age based on your birthday.
// ==========================================

const ageElement = document.getElementById("age");

function calculateAge(birthDateString) {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  
  // Calculate the raw difference in years
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  
  // If your birthday month hasn't happened yet this year, 
  // OR it's your birthday month but the day hasn't happened yet, subtract 1 year.
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Inject the age into the DOM if the element exists
if (ageElement) {
  ageElement.textContent = calculateAge("2008-05-03");
}