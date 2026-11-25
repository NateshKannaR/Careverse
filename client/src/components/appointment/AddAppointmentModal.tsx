import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { X, Calendar, Plus, Trash2 } from 'lucide-react';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentAdded: () => void;
  patientId?: string;
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  isOpen,
  onClose,
  onAppointmentAdded,
  patientId
}) => {
  const { t } = useLanguage();
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('Cardiologist');
  const [hospitalClinic, setHospitalClinic] = useState('');
  const [address, setAddress] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [contactNumber, setContactNumber] = useState('');
  const [appointmentPurpose, setAppointmentPurpose] = useState('');
  const [checklistTasks, setChecklistTasks] = useState<string[]>([
    'Carry current medication list and BP readings',
    'Fasting blood sample at lab'
  ]);
  const [newTask, setNewTask] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddChecklistTask = () => {
    if (newTask.trim()) {
      setChecklistTasks(prev => [...prev, newTask.trim()]);
      setNewTask('');
    }
  };

  const handleRemoveChecklistTask = (index: number) => {
    setChecklistTasks(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !hospitalClinic.trim() || !appointmentDate || !appointmentPurpose.trim()) {
      setError('Please fill in doctor, hospital, date, and purpose.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.appointments.create({
        patient_id: patientId,
        doctor_name: doctorName.trim(),
        specialty,
        hospital_clinic: hospitalClinic.trim(),
        address: address.trim(),
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        contact_number: contactNumber.trim(),
        appointment_purpose: appointmentPurpose.trim(),
        preparation_checklist: checklistTasks.map(task => ({ task, completed: false })),
        notes: notes.trim(),
        status: 'scheduled'
      });
      onAppointmentAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-appt-title"
      className="care-overlay"
    >
      <div className="care-dialog bg-white rounded-2xl max-w-xl p-4 sm:p-8 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-200 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-800 rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 id="modal-appt-title" className="text-xl font-bold text-slate-900">
                {t.appointments.scheduleAppointment}
              </h2>
              <p className="text-xs text-slate-500">Add clinician consultation and preparation checklist</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="min-h-11 min-w-11 shrink-0 p-2 text-slate-600 hover:text-slate-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name *</label>
              <input
                type="text"
                required
                value={doctorName}
                onChange={e => setDoctorName(e.target.value)}
                placeholder="Dr. Robert Mehta"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Specialty</label>
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="Cardiologist">Cardiologist</option>
                <option value="Endocrinologist">Endocrinologist</option>
                <option value="Primary Care Physician">Primary Care Physician</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Orthopedic Surgeon">Orthopedic</option>
                <option value="Ophthalmologist">Ophthalmologist</option>
                <option value="Dentist">Dentist</option>
                <option value="Physical Therapist">Physical Therapist</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hospital / Clinic *</label>
              <input
                type="text"
                required
                value={hospitalClinic}
                onChange={e => setHospitalClinic(e.target.value)}
                placeholder="Springfield Heart Institute"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Clinic Contact Phone</label>
              <input
                type="text"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder="+1 (555) 789-1122"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Address / Suite</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="100 Medical Center Dr, Suite 300, Springfield, OR"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Appointment Date *</label>
              <input
                type="date"
                required
                value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time *</label>
              <input
                type="time"
                required
                value={appointmentTime}
                onChange={e => setAppointmentTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Purpose of Visit *</label>
            <input
              type="text"
              required
              value={appointmentPurpose}
              onChange={e => setAppointmentPurpose(e.target.value)}
              placeholder="Routine 6-month blood pressure review"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          {/* Preparation Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Pre-Visit Preparation Checklist</label>
            <div className="space-y-2 mb-2">
              {checklistTasks.map((task, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <span>• {task}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistTask(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Add checklist task (e.g. Bring fasting lab results)"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklistTask}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition"
            >
              {loading ? 'Scheduling...' : 'Schedule Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
