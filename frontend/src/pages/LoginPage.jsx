import { useState } from "react";
import { useAuth } from "../context/AuthContexts";
import { supportAPI } from "../services/api";
import { Activity } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  
  // Support Form State
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportDetails, setSupportDetails] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState("");
  const [supportError, setSupportError] = useState("");

  const handleSupportSubmit = async (e, type) => {
    e.preventDefault();
    setSupportLoading(true);
    setSupportError("");
    setSupportSuccess("");

    try {
      await supportAPI.createTicket({
        ticket_type: type,
        email: supportEmail,
        name: supportName,
        details: { message: supportDetails }
      });
      
      setSupportSuccess("Permintaan berhasil dikirim. Administrator akan segera memprosesnya.");
      setTimeout(() => {
        setShowForgotModal(false);
        setShowContactModal(false);
        setSupportSuccess("");
        setSupportName("");
        setSupportEmail("");
        setSupportDetails("");
      }, 3000);
    } catch (err) {
      setSupportError("Terjadi kesalahan sistem. Silahkan coba lagi.");
    } finally {
      setSupportLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 font-sans relative flex flex-col overflow-hidden">
      
      {/* Abstract Background Shapes Confined to a Wrapper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000"></div>
      </div>
      
      {/* Centered Content that Expands Naturally */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full max-w-md mx-auto p-4 py-8">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md shadow-lg border border-white/20 mb-5 relative group cursor-default">
            <div className="absolute inset-0 bg-blue-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <Activity className="w-10 h-10 text-white relative z-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Athlete Monitor</h1>
          <p className="text-sm text-blue-200 mt-2 font-medium">Sistem Pemantauan Atlet Profesional</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl w-full p-6 md:p-8 border border-white/20 relative overflow-hidden">
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Selamat Datang</h2>
            <p className="text-sm text-gray-500 mt-2">Silahkan masuk menggunakan kredensial Anda</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 text-center font-medium flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alamat Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-400"
                placeholder="Masukan email Anda"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Kata Sandi
                </label>
                <button type="button" onClick={() => setShowForgotModal(true)} className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors">Lupa sandi?</button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-400"
                placeholder="Masukkan kata sandi"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all text-sm mt-4 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.98]"
            >
              {loading ? "Memproses..." : "Masuk ke Dashboard"}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500 font-medium">
              Belum memiliki akun? <button type="button" onClick={() => setShowContactModal(true)} className="text-blue-600 hover:text-blue-700 hover:underline font-bold transition-colors">Hubungi Administrator</button>
            </p>
          </div>
        </div>
        
        {/* Footer info */}
        <p className="text-xs text-blue-200/50 mt-6 font-medium">
          &copy; {new Date().getFullYear()} Tim Ilmu Keolahragaan
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Lupa Kata Sandi</h3>
            <p className="text-sm text-gray-500 mb-4">Masukkan email dan nama Anda. Admin akan mereset kata sandi Anda.</p>
            
            {supportSuccess && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm mb-4">{supportSuccess}</div>}
            {supportError && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-4">{supportError}</div>}

            <form onSubmit={(e) => handleSupportSubmit(e, 'password_reset')} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                <input required type="text" value={supportName} onChange={e => setSupportName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Terdaftar</label>
                <input required type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="flex space-x-2 pt-2">
                <button type="button" onClick={() => setShowForgotModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">Batal</button>
                <button type="submit" disabled={supportLoading} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm">{supportLoading ? 'Mengirim...' : 'Kirim Tiket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Admin Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Permintaan Akun Baru</h3>
            <p className="text-sm text-gray-500 mb-4">Silahkan isi data diri Anda untuk meminta pembuatan akun ke Administrator.</p>
            
            {supportSuccess && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm mb-4">{supportSuccess}</div>}
            {supportError && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-4">{supportError}</div>}

            <form onSubmit={(e) => handleSupportSubmit(e, 'account_creation')} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                <input required type="text" value={supportName} onChange={e => setSupportName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Email</label>
                <input required type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Detail Permintaan (Peran, Nama Tim, dll)</label>
                <textarea required rows="3" value={supportDetails} onChange={e => setSupportDetails(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Contoh: Saya adalah pelatih baru untuk Tim Garuda..."></textarea>
              </div>
              <div className="flex space-x-2 pt-2">
                <button type="button" onClick={() => setShowContactModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">Batal</button>
                <button type="submit" disabled={supportLoading} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm">{supportLoading ? 'Mengirim...' : 'Kirim Permintaan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
