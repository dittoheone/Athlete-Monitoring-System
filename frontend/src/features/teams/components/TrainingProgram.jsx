import { useState, useEffect } from "react";
import { exerciseAPI, athleteAPI, scheduleAPI } from "../../../services/api";
import { Calendar, Download, Plus, X, UserPlus, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import { generatePDFReport } from "../../../utils/pdfGenerator";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function TrainingProgram() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    date: "",
    title: "",
    target: "All Players",
    sessionType: "Pagi",
    timeRange: "08:00 - 10:00"
  });
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    athleteId: "",
    exerciseId: "",
    frequency: "3x Seminggu",
    intensity: "Medium",
    sets: 3,
    reps: 10
  });

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['trainingPrograms'],
    queryFn: () => exerciseAPI.getTrainingPrograms().then(res => res.data)
  });

  const { data: athletes = [], isLoading: loadingAthletes } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => athleteAPI.getAll().then(res => res.data)
  });

  const { data: teamSchedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => scheduleAPI.getAll().then(res => res.data)
  });

  const { data: exercises = [], isLoading: loadingExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exerciseAPI.getAll().then(res => res.data)
  });

  const loading = loadingPrograms || loadingAthletes || loadingSchedules || loadingExercises;

  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['trainingPrograms'] });
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
  };

  // Group programs by athlete
  const programsByAthlete = programs.reduce((acc, program) => {
    if (!acc[program.athlete_id]) {
      acc[program.athlete_id] = {
        athleteId: program.athlete_id,
        athleteName: program.athlete_name,
        athletePosition: program.athlete_position,
        programs: []
      };
    }
    acc[program.athlete_id].programs.push(program);
    return acc;
  }, {});

  const assignedAthletes = Object.values(programsByAthlete);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white h-96 rounded-2xl animate-pulse"></div>
          <div className="bg-white h-96 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }



  const handleExportPDF = () => {
    const columns = ["Tanggal", "Judul Sesi", "Target", "Sesi", "Waktu"];
    const data = teamSchedules.map(schedule => [
      new Date(schedule.date).toLocaleDateString('id-ID'),
      schedule.title,
      schedule.target,
      schedule.session_type,
      schedule.time_range
    ]);

    generatePDFReport(
      "Laporan Agenda Tim",
      columns,
      data,
      "agenda_tim.pdf"
    );
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await scheduleAPI.create(newSchedule);
      addToast("Jadwal berhasil ditambahkan!", "success");
      setIsModalOpen(false);
      setNewSchedule({ date: "", title: "", target: "All Players", sessionType: "Pagi", timeRange: "08:00 - 10:00" });
      fetchData(); // refresh list
    } catch (err) {
      console.error(err);
      addToast("Gagal menambahkan jadwal", "error");
    }
  };

  const handleAssignProgram = async (e) => {
    e.preventDefault();
    if (!newProgram.athleteId || !newProgram.exerciseId) {
      addToast("Pilih atlet dan program terlebih dahulu", "warning");
      return;
    }
    try {
      await exerciseAPI.createProgram(newProgram);
      addToast("Program berhasil ditugaskan!", "success");
      setIsAssignModalOpen(false);
      setNewProgram({
        athleteId: "", exerciseId: "", frequency: "3x Seminggu", intensity: "Medium", sets: 3, reps: 10
      });
      fetchData();
    } catch (err) {
      console.error(err);
      addToast("Gagal menugaskan program", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda & Program Tim</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola jadwal tim dan program penugasan individu.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleExportPDF}
            className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Kalender (PDF)
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Jadwal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Agenda Tim */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-blue-600" />
              Agenda Tim (Latihan & Pertandingan)
            </h3>
            <button className="text-blue-600 text-xs font-bold hover:text-blue-700">Lihat Kalender Lengkap</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {teamSchedules.length > 0 ? teamSchedules.map((schedule, i) => (
              <div key={i} className="flex space-x-4">
                <div className="flex flex-col items-center justify-center w-16 bg-blue-50 rounded-xl p-2 border border-blue-100 flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-600 uppercase">{new Date(schedule.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                  <span className="text-lg font-bold text-gray-900">{new Date(schedule.date).getDate()}</span>
                </div>
                <div className="flex-1 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900">{schedule.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-1 bg-gray-200 text-gray-700 rounded-md uppercase">
                      {schedule.session_type}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span>Target: <strong className="text-gray-700">{schedule.target}</strong></span>
                    <span>Waktu: <strong className="text-gray-700">{schedule.time_range}</strong></span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Calendar className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Belum ada jadwal yang direncanakan</p>
              </div>
            )}
          </div>
        </div>

        {/* Tugas Individu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Tugas Individu / Pemulihan</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {assignedAthletes.length > 0 ? (
              assignedAthletes.map(athlete => {
                // Find athlete status
                const ath = athletes.find(a => a.id === athlete.athleteId);
                const status = ath?.status || 'Fit';
                
                return (
                  <div key={athlete.athleteId} className="border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900">{athlete.athleteName}</h4>
                        <span className="text-xs text-gray-500">{athlete.athletePosition}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase
                        ${status === 'Cedera' || status === 'Rehabilitasi' ? 'bg-red-100 text-red-700' :
                          status === 'Pemulihan' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'}`}
                      >
                        {status}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {athlete.programs.map((program, idx) => (
                        <div key={program.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            {idx === 0 ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 mr-3" />
                            )}
                            <div>
                              <p className="text-sm font-bold text-gray-800">{program.exercise_name}</p>
                              <p className="text-xs text-gray-500">
                                {program.sets} Sets x {program.reps} Reps • {program.frequency}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                            {program.exercise_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <UserPlus className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">Belum ada tugas individu.</p>
                <button 
                  onClick={() => setIsAssignModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                >
                  Assign Program
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Tambah Jadwal Baru</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Judul Sesi / Pertandingan</label>
                <input 
                  type="text"
                  required
                  value={newSchedule.title}
                  onChange={e => setNewSchedule({...newSchedule, title: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Contoh: Tactical & Fitness, Match vs Persija"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date"
                  required
                  value={newSchedule.date}
                  onChange={e => setNewSchedule({...newSchedule, date: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sesi</label>
                  <select
                    value={newSchedule.sessionType}
                    onChange={e => setNewSchedule({...newSchedule, sessionType: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="Pagi">Pagi</option>
                    <option value="Sore">Sore</option>
                    <option value="Malam">Malam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Waktu</label>
                  <input 
                    type="text"
                    required
                    value={newSchedule.timeRange}
                    onChange={e => setNewSchedule({...newSchedule, timeRange: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="08:00 - 10:00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Target Peserta</label>
                <select
                  value={newSchedule.target}
                  onChange={e => setNewSchedule({...newSchedule, target: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="All Players">All Players</option>
                  <option value="Starting XI">Starting XI</option>
                  <option value="Match Squad">Match Squad</option>
                  <option value="Reserves">Reserves</option>
                  <option value="Recovery Group">Recovery Group</option>
                </select>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-colors shadow-sm shadow-blue-200"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Program Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Assign Program Individu</h2>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAssignProgram} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pilih Atlet</label>
                <select
                  required
                  value={newProgram.athleteId}
                  onChange={e => setNewProgram({...newProgram, athleteId: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">-- Pilih Atlet --</option>
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pilih Latihan</label>
                <select
                  required
                  value={newProgram.exerciseId}
                  onChange={e => setNewProgram({...newProgram, exerciseId: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">-- Pilih Latihan --</option>
                  {exercises.map(e => (
                    <option key={e.id} value={e.id}>{e.name} - {e.type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Frekuensi</label>
                  <input 
                    type="text"
                    required
                    value={newProgram.frequency}
                    onChange={e => setNewProgram({...newProgram, frequency: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Intensitas</label>
                  <select
                    value={newProgram.intensity}
                    onChange={e => setNewProgram({...newProgram, intensity: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sets</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={newProgram.sets}
                    onChange={e => setNewProgram({...newProgram, sets: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reps</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={newProgram.reps}
                    onChange={e => setNewProgram({...newProgram, reps: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-colors shadow-sm shadow-blue-200"
                >
                  Tugaskan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
