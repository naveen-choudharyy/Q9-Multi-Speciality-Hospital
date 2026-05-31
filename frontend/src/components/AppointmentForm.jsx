import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { departments } from '../data/departments';
import { doctors } from '../data/doctors';
import { CheckCircle2, Send } from 'lucide-react';
import api from '../services/api';

const TIME_SLOTS = [
  { value: '09:00', label: '09:00 AM (Morning)' },
  { value: '09:30', label: '09:30 AM (Morning)' },
  { value: '10:00', label: '10:00 AM (Morning)' },
  { value: '10:30', label: '10:30 AM (Morning)' },
  { value: '11:00', label: '11:00 AM (Morning)' },
  { value: '11:30', label: '11:30 AM (Morning)' },
  { value: '12:00', label: '12:00 PM (Noon)' },
  { value: '12:30', label: '12:30 PM (Noon)' },
  { value: '14:00', label: '02:00 PM (Afternoon)' },
  { value: '14:30', label: '02:30 PM (Afternoon)' },
  { value: '15:00', label: '03:00 PM (Afternoon)' },
  { value: '15:30', label: '03:30 PM (Afternoon)' },
  { value: '16:00', label: '04:00 PM (Evening)' },
  { value: '16:30', label: '04:30 PM (Evening)' },
  { value: '17:00', label: '05:00 PM (Evening)' },
  { value: '17:30', label: '05:30 PM (Evening)' },
  { value: '18:00', label: '06:00 PM (Evening)' }
];

export default function AppointmentForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const formDataTemplate = {
    name: '',
    phone: '',
    email: '',
    department: '',
    doctor: '',
    date: '',
    time: '',
    message: ''
  };

  const [formData, setFormData] = useState({ ...formDataTemplate });

  // ✅ Filter doctors based on department
  const filteredDoctors = doctors.filter(
    (d) => !formData.department || d.department === formData.department
  );

  // Helper to get today's local date string (YYYY-MM-DD)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get current local time string (HH:MM)
  const getCurrentTimeString = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // ✅ Filter time slots (if booking for today, exclude past slots)
  const filteredTimeSlots = TIME_SLOTS.filter((slot) => {
    if (formData.date === getTodayString()) {
      return slot.value > getCurrentTimeString();
    }
    return true;
  });

  // Auto-reset time slot if changing date renders current slot obsolete
  useEffect(() => {
    if (formData.time && formData.date === getTodayString()) {
      const isAvailable = filteredTimeSlots.some((slot) => slot.value === formData.time);
      if (!isAvailable) {
        setFormData((prev) => ({ ...prev, time: '' }));
      }
    }
  }, [formData.date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/appointments/public', formData);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setFormKey(prev => prev + 1);
        setFormData({ ...formDataTemplate });
      }, 3000);
    } catch (err) {
      console.error("Error booking public appointment: ", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
      {isSubmitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-12 text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            Appointment Requested!
          </h3>
          <p className="text-slate-500">
            We have received your request and will contact you shortly.
          </p>
        </motion.div>
      ) : (
        <form key={formKey} onSubmit={handleSubmit} className="p-8 md:p-12 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Name */}
            <div>
              <label className="text-sm font-semibold">Patient Full Name</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 rounded-xl border"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-semibold">Phone Number</label>
              <input
                required
                type="tel"
                className="w-full px-4 py-3 rounded-xl border"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-semibold">Email</label>
              <input
                required
                type="email"
                className="w-full px-4 py-3 rounded-xl border"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            {/* Department */}
            <div>
              <label className="text-sm font-semibold">Department</label>
              <select
                required
                className="w-full px-4 py-3 rounded-xl border"
                value={formData.department}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    department: e.target.value,
                    doctor: ''
                  })
                }
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor */}
            <div>
              <label className="text-sm font-semibold">Doctor</label>
              <select
                required
                className="w-full px-4 py-3 rounded-xl border bg-white text-slate-800"
                value={formData.doctor}
                onChange={(e) => {
                  const selectedDocId = e.target.value;
                  const doc = doctors.find((d) => d.id === selectedDocId);
                  if (doc) {
                    setFormData({
                      ...formData,
                      doctor: selectedDocId,
                      department: doc.department
                    });
                  } else {
                    setFormData({
                      ...formData,
                      doctor: ''
                    });
                  }
                }}
              >
                <option value="">Select Doctor</option>
                {filteredDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} - {doc.specialization}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="text-sm font-semibold">Date</label>
              <input
                required
                type="date"
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 rounded-xl border"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            {/* Time */}
            <div>
              <label className="text-sm font-semibold">Time Slot</label>
              <select
                required
                className="w-full px-4 py-3 rounded-xl border bg-white text-slate-800"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
              >
                {filteredTimeSlots.length === 0 && formData.date === getTodayString() ? (
                  <option value="">No slots left for today. Please select another date.</option>
                ) : (
                  <>
                    <option value="">Select Time Slot</option>
                    {filteredTimeSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold">Message</label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 rounded-xl border"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Confirming Appointment...' : 'Confirm Appointment'}
            <Send className="ml-2 h-5 w-5" />
          </button>

        </form>
      )}
    </div>
  );
}