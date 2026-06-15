import { useState, useEffect } from "react";
import { supportAPI } from "../../../services/api";
import { 
  Inbox, 
  CheckCircle, 
  UserPlus, 
  KeyRound, 
  Clock,
  AlertCircle
} from "lucide-react";
import LoadingSkeleton from "../../../components/common/LoadingSkeleton";

export default function SupportInbox({ onProcessAccountRequest }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await supportAPI.getAll();
      setTickets(res.data);
    } catch (err) {
      setError("Gagal memuat tiket dukungan");
    } finally {
      setLoading(false);
    }
  };

  const handleResolvePassword = async (ticket) => {
    setProcessingId(ticket.id);
    setTempPassword(null);
    try {
      const res = await supportAPI.resolve(ticket.id, 'reset_password');
      setTempPassword({ id: ticket.id, password: res.data.tempPassword });
      fetchTickets();
    } catch (err) {
      alert("Gagal mereset kata sandi. Pastikan email terdaftar.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveAccount = async (ticket) => {
    setProcessingId(ticket.id);
    try {
      // First resolve the ticket
      await supportAPI.resolve(ticket.id, 'process_account');
      
      // Then trigger the modal in the parent Admin page to pre-fill the form
      onProcessAccountRequest({
        name: ticket.name,
        email: ticket.email,
        details: ticket.details?.message
      });
      
      fetchTickets();
    } catch (err) {
      alert("Gagal memproses tiket.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className="p-4 text-red-500 bg-red-50 rounded-xl">{error}</div>;

  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');

  return (
    <div className="space-y-6">
      
      {/* Pending Tickets */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
          Menunggu Tindakan ({pendingTickets.length})
        </h3>
        {pendingTickets.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center shadow-sm">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Tidak ada tiket baru</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTickets.map(ticket => (
              <div key={ticket.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${ticket.ticket_type === 'password_reset' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {ticket.ticket_type === 'password_reset' ? 'Lupa Sandi' : 'Buat Akun'}
                  </div>
                  <span className="text-xs text-gray-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(ticket.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
                
                <h4 className="font-bold text-gray-900">{ticket.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{ticket.email}</p>
                {ticket.details?.message && (
                  <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded-lg mb-4 italic flex-1">
                    "{ticket.details.message}"
                  </p>
                )}
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  {tempPassword?.id === ticket.id ? (
                    <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                      <p className="text-xs text-green-700 mb-1 font-bold">Kata Sandi Sementara:</p>
                      <code className="text-lg font-mono font-bold text-green-900 block text-center bg-white py-2 rounded-lg border border-green-300">
                        {tempPassword.password}
                      </code>
                      <p className="text-xs text-gray-500 mt-2 text-center">Copy dan kirimkan ke pengguna</p>
                    </div>
                  ) : ticket.ticket_type === 'password_reset' ? (
                    <button 
                      onClick={() => handleResolvePassword(ticket)}
                      disabled={processingId === ticket.id}
                      className="w-full flex items-center justify-center py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl transition-colors text-sm"
                    >
                      <KeyRound className="w-4 h-4 mr-2" />
                      {processingId === ticket.id ? 'Memproses...' : 'Generate Password'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleResolveAccount(ticket)}
                      disabled={processingId === ticket.id}
                      className="w-full flex items-center justify-center py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl transition-colors text-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {processingId === ticket.id ? 'Memproses...' : 'Proses Akun'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Tickets */}
      {resolvedTickets.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
            Riwayat Terselesaikan
          </h3>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-4 font-semibold">Tipe</th>
                  <th className="p-4 font-semibold">Nama / Email</th>
                  <th className="p-4 font-semibold">Tanggal Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resolvedTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${ticket.ticket_type === 'password_reset' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        {ticket.ticket_type === 'password_reset' ? 'Reset Sandi' : 'Buat Akun'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{ticket.name}</p>
                      <p className="text-gray-500 text-xs">{ticket.email}</p>
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(ticket.resolved_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
