import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import MainLayout from './layout/MainLayout';
import ScrollToTop from "./components/ScrollToTop.jsx";

import Home from './pages/Home';
import About from './pages/About';
import Doctors from './pages/Doctors';
import DoctorProfile from './pages/DoctorProfile';
import Departments from './pages/Departments';
import DepartmentDetails from './pages/DepartmentDetails';
import Services from './pages/Services';
import Appointment from './pages/Appointment';
import Gallery from './pages/Gallery';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';

// New Smart Portal views
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DiseasePrediction from './pages/DiseasePrediction';
import AmbulanceTracking from './pages/AmbulanceTracking';
import ChatbotWidget from './components/ChatbotWidget';

export default function App() {
  return (
    <Router>

      {/* THIS FIXES YOUR SCROLL ISSUE */}
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="doctors" element={<Doctors />} />
          <Route path="doctors/:doctorId" element={<DoctorProfile />} />
          <Route path="departments" element={<Departments />} />
          <Route path="departments/:id" element={<DepartmentDetails />} />
          <Route path="services" element={<Services />} />
          <Route path="appointment" element={<Appointment />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        {/* Portal & AI Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard/patient" element={<PatientDashboard />} />
        <Route path="/dashboard/doctor" element={<DoctorDashboard />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/disease-prediction" element={<DiseasePrediction />} />
        <Route path="/ambulance-tracking" element={<AmbulanceTracking />} />
      </Routes>

      {/* Global AI Chatbot floating assistant */}
      <ChatbotWidget />

    </Router>
  );
}