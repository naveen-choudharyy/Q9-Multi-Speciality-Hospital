// Route coordinates simulating an ambulance moving towards Q9 Multi-speciality Hospital
const HOSPITAL_COORDINATES = { lat: 12.9716, lng: 77.5946 }; // Bangalore Center Mock

const SIMULATION_ROUTE = [
  { lat: 12.9916, lng: 77.5746 },
  { lat: 12.9880, lng: 77.5800 },
  { lat: 12.9840, lng: 77.5850 },
  { lat: 12.9790, lng: 77.5900 },
  { lat: 12.9750, lng: 77.5920 },
  { lat: 12.9716, lng: 77.5946 } // Hospital arrival
];

let simulationInterval = null;
let currentIndex = 0;

const startAmbulanceSimulation = (io) => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  currentIndex = 0;
  console.log("Starting ambulance GPS route simulation...");

  simulationInterval = setInterval(() => {
    if (currentIndex < SIMULATION_ROUTE.length) {
      const position = SIMULATION_ROUTE[currentIndex];
      console.log(`Ambulance position updated: Lat ${position.lat}, Lng ${position.lng}`);
      
      // Emit update to all listening sockets in tracking room
      io.to('ambulance_tracking').emit('ambulance-location-update', {
        ambulanceId: "AMB-911",
        driverName: "Rohan Sharma",
        phone: "+91 98765 43210",
        position,
        destination: HOSPITAL_COORDINATES,
        eta: `${(SIMULATION_ROUTE.length - 1 - currentIndex) * 2} mins`
      });

      currentIndex++;
    } else {
      console.log("Ambulance arrived at the hospital. Simulation finished.");
      io.to('ambulance_tracking').emit('ambulance-arrival', {
        message: "Ambulance AMB-911 has arrived at the emergency bay."
      });
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  }, 3000); // Update every 3 seconds for fast-paced simulation demo
};

module.exports = { startAmbulanceSimulation };
