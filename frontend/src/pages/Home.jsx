import React, { useState, useEffect, useRef } from 'react';
import Hero from '../components/Hero.jsx';
import { departments } from '../data/department';
import { doctors } from '../data/doctors';
import DoctorCard from '../components/DoctorCard';
import { motion } from 'framer-motion';
import { Shield, Users, Zap, Heart, ArrowRight, Quote, Phone, Send, Clock, User, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSelector } from 'react-redux';
import useSEO from '../utils/useSEO';

const features = [
  { icon: Zap, title: '24/7 Emergency', desc: 'Round-the-clock emergency medical services with rapid response teams.' },
  { icon: Users, title: 'Qualified Doctors', desc: 'Expert medical professionals with years of experience in various fields.' },
  { icon: Shield, title: 'Advanced Tech', desc: 'Equipped with the latest medical technology for precise diagnosis.' },
  { icon: Heart, title: 'Patient Care', desc: 'Compassionate care focused on patient comfort and recovery.' },
];
const accents = [
  "from-blue-500 to-blue-300",
  "from-green-500 to-green-300",
  "from-purple-500 to-purple-300",
  "from-red-500 to-red-300"
];

const testimonials = [
  { name: 'John Smith', role: 'Patient', text: 'The care I received was exceptional. The doctors and staff were professional and caring throughout my recovery.', rating: 5 },
  { name: 'Sarah Williams', role: 'Patient', text: 'State-of-the-art facilities and very knowledgeable doctors. Highly recommended.', rating: 5 },
  { name: 'Michael Brown', role: 'Patient', text: 'Booking was seamless. The pediatric team is wonderful. Truly a world-class hospital.', rating: 4 },
  { name: 'Anjali Reddy', role: 'Patient', text: 'Doctors explained everything clearly and treatment was excellent.', rating: 5 },
  { name: 'Rahul Kumar', role: 'Patient', text: 'Very clean hospital with friendly staff and quick service.', rating: 4 },
  { name: 'Priya Sharma', role: 'Patient', text: 'Highly satisfied with the care and attention provided.', rating: 5 },
];

const getRatingLabel = (rating) => {
  switch (rating) {
    case 5: return { text: 'Excellent', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    case 4: return { text: 'Very Good', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    case 3: return { text: 'Good', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
    case 2: return { text: 'Average', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
    case 1: return { text: 'Poor', color: 'bg-red-500/10 text-red-550 border-red-500/20' };
    default: return { text: 'Excellent', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  }
};


export default function Home() {
  useSEO({
    title: 'Q9 Multi-Specialty Hospital - Best Clinical Care',
    description: 'Welcome to Q9 Multi-Specialty Hospital. Experience premium clinical care, modern cardiology, advanced diagnostic templates, and automated online appointments booking.'
  });

  const [dynamicReviews, setDynamicReviews] = useState([]);
  const { user } = useSelector((state) => state.auth);
  const [patientAppointments, setPatientAppointments] = useState([]);

  const [reviewName, setReviewName] = useState(user?.name || '');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setReviewName(user.name);
    }
  }, [user]);

  const containerRef = useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId;
    const speed = 0.8; // fine-tuned speed for smooth continuous movement

    const scroll = () => {
      // Only auto-scroll if user is not actively dragging or hovering
      if (!isDown && !isHovered) {
        container.scrollLeft += speed;
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isDown, isHovered]);

  const handleScroll = (e) => {
    const container = e.currentTarget;
    const halfWidth = container.scrollWidth / 2;
    if (container.scrollLeft >= halfWidth) {
      container.scrollLeft -= halfWidth;
    } else if (container.scrollLeft <= 0) {
      container.scrollLeft += halfWidth;
    }
  };

  const handleMouseDown = (e) => {
    setIsDown(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeftState(containerRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDown(false);
  };

  const handleMouseLeave = () => {
    setIsDown(false);
    setIsHovered(false);
  };

  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // sensitivity adjustment
    containerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleTouchStart = (e) => {
    setIsDown(true);
    setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
    setScrollLeftState(containerRef.current.scrollLeft);
  };

  const handleTouchEnd = () => {
    setIsDown(false);
  };

  const handleTouchMove = (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const fetchPatientAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      if (response.data.success) {
        setPatientAppointments(response.data.appointments);
      }
    } catch (err) {
      console.error("Error fetching patient appointments: ", err);
    }
  };

  useEffect(() => {
    fetchReviews();
    if (user && user.role === 'Patient') {
      fetchPatientAppointments();
    }
  }, [user]);

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews');
      if (response.data.success) {
        setDynamicReviews(response.data.reviews);
      }
    } catch (err) {
      console.error("Error fetching reviews: ", err);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewName || !reviewText) return;
    setSubmitLoading(true);

    try {
      const response = await api.post('/reviews', {
        name: reviewName,
        rating: reviewRating,
        text: reviewText,
        role: 'Patient'
      });
      
      if (response.data.success) {
        setReviewSubmitted(true);
        setReviewText('');
        setReviewRating(5);
        fetchReviews();
        setTimeout(() => setReviewSubmitted(false), 3000);
      }
    } catch (err) {
      console.error("Error submitting review: ", err);
    } finally {
      setSubmitLoading(false);
    }
  };



  const displayReviews = [...dynamicReviews, ...testimonials];

  return (
    <div className="space-y-28 pb-24">

      <Hero />

      {/* Logged-in Patient Appointments Panel */}
      {user && user.role === 'Patient' && patientAppointments.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fadeIn">
          <div className="bg-white border border-slate-200/60 p-8 md:p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <Calendar className="w-7 h-7 text-blue-600" />
                  Your Scheduled Consultations
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Active queue limits, schedule timings, and clinic diagnostics.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/disease-prediction"
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-full text-xs transition border border-indigo-100"
                >
                  AI Disease prediction
                </Link>
                <Link
                  to="/ambulance-tracking"
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-full text-xs transition border border-red-100"
                >
                  Ambulance SOS Map
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patientAppointments.map((apt) => (
                <div 
                  key={apt._id} 
                  className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">
                          Dr. {apt.doctorId?.userId?.name || 'Assigned Specialist'}
                        </h4>
                        <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                          {apt.doctorId?.specialization || 'Clinical Generalist'}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 border rounded-full uppercase tracking-wider ${
                        apt.status === 'scheduled' 
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : apt.status === 'completed'
                            ? 'bg-green-50 text-green-600 border-green-100'
                            : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {apt.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-200/40">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{new Date(apt.dateTime).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="italic">"{apt.symptoms || 'General consult'}"</span>
                      </div>
                    </div>
                  </div>

                  {apt.status === 'scheduled' && (
                    <div className="mt-6 p-3.5 bg-white border border-slate-200/50 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase text-[9px]">Queue Position</span>
                        <span className="font-bold text-slate-800 text-sm">#{apt.queueNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 font-semibold block uppercase text-[9px]">Est. Wait Time</span>
                        <span className="font-bold text-blue-600">~{apt.predictedWaitTime} mins</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Emergency CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-red-600 rounded-[2rem] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-red-600/30"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-4">
              <span className="relative flex h-5 w-5 md:h-6 md:w-6">
                <span className="animate-ping absolute h-full w-full rounded-full bg-white opacity-40"></span>
                <span className="relative rounded-full h-5 w-5 md:h-6 md:w-6 bg-white"></span>
              </span>
              24/7 Emergency Service Available
            </h2>
            <p className="text-red-100 text-lg max-w-2xl">
              Rapid response teams and life support ambulances ready for critical situations.
            </p>
          </div>

          <a
            href="tel:+919257540743"
            className="bg-white text-red-600 px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-red-50 hover:scale-105 transition-all shadow-lg"
          >
            <Phone className="h-5 w-5" />
            Call Now
          </a>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {features.map((feature, i) => (
            <div
              key={i}
              className="group relative bg-white hover:bg-blue-50/30 rounded-3xl p-6 border border-slate-100 hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >

              {/* 🔥 Gradient Top Accent */}
              <div
                className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${accents[i]} rounded-t-3xl`}
              ></div>

              {/* Icon */}
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-100 transition">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed">
                {feature.desc}
              </p>

            </div>
          ))}

        </div>
      </section>

      {/* Departments */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
            <div className="flex flex-col items-center text-center mb-12 w-full">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
                Specialists In
              </h2>

              <p className="text-slate-600 max-w-xl mx-auto">
                Explore our specialized medical experts equipped with advanced care.
              </p>
            </div>
          </div>

          {/* 🔥 ADD THIS HERE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {departments.slice(0, 6).map((dept) => (
              <Link to={`/departments/${dept.id}`} key={dept.id}>
                <div className="bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden group">

                  <img
                    src={dept.image}
                    alt={dept.title}
                    className="w-full h-40 object-cover group-hover:scale-105 transition"
                  />

                  <div className="p-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {dept.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {dept.description}
                    </p>
                  </div>

                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/departments"
              className="inline-flex items-center px-8 py-3 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 hover:scale-105 transition"
            >
              View All Departments <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Specialists Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Specialists</h2>
          <p className="text-slate-600">Our expert doctors provide the best care.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {doctors.slice(0, 4).map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/doctors"
            className="inline-flex items-center px-8 py-3 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 hover:scale-105 transition"
          >
            View All Doctors <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/*  CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Schedule Your Visit?
          </h2>
          <p className="text-xl mb-10">
            Book your appointment with our expert team today.
          </p>

          <Link
            to="/appointment"
            className="inline-flex px-10 py-4 bg-white text-blue-600 rounded-full font-bold hover:scale-105 transition shadow-xl"
          >
            Book Appointment Now
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">

          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Patients Say
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              Real stories and ratings from families who trust Q9 Multi-speciality Hospital with their healthcare needs.
            </p>
          </div>

          {/* 🔥 SCROLL WRAPPER */}
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onMouseEnter={() => setIsHovered(true)}
            className="overflow-x-auto no-scrollbar mb-16 select-none cursor-grab active:cursor-grabbing"
          >

            <div className="flex gap-8 w-max py-4 px-2">

              {[...displayReviews, ...displayReviews].map((t, i) => (
                <div
                  key={i}
                  className="min-w-[320px] max-w-[320px] p-8 bg-slate-50 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition flex flex-col justify-between"
                >
                  <div>
                    <Quote className="mb-4 text-blue-600/20" />
                    <p className="italic text-slate-700 mb-6 text-sm">"{t.text}"</p>
                  </div>
                  <div>
                    <div className="mb-3">
                      {(() => {
                        const badge = getRatingLabel(t.rating || 5);
                        return (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.color}`}>
                            {badge.text}
                          </span>
                        );
                      })()}
                    </div>
                    <h4 className="font-bold text-slate-900">{t.name}</h4>
                    <p className="text-xs text-blue-600 font-semibold">{t.role || 'Patient'}</p>
                  </div>
                </div>
              ))}

            </div>

          </div>



        </div>
      </section>

    </div>
  );
}